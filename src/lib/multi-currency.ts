import { frappe } from "./frappe-client";
import { FrappeAPIError } from "./frappe-types";
import type { JournalEntryAccount } from "@/types/journal-entry";

interface CompanyDoc {
  name: string;
  enable_multi_currency: 0 | 1;
  default_currency: string;
  write_off_account?: string;
}

/**
 * Checks if the given currencies require multi-currency, and if so,
 * auto-enables the flag on the Company doc.
 *
 * Returns true if multi-currency is needed, false otherwise.
 */
export async function ensureMultiCurrencyEnabled(
  companyName: string,
  accountCurrencies: string[],
): Promise<boolean> {
  const filtered = accountCurrencies.filter(Boolean);
  if (filtered.length === 0) return false;

  const company = await frappe.getDoc<CompanyDoc>("Company", companyName);

  // Multi-currency needed when ANY account currency differs from the company's
  // default currency — ERPNext validates this, not just whether the two sides differ.
  const needsMultiCurrency = filtered.some((c) => c !== company.default_currency);
  if (!needsMultiCurrency) return false;

  if (company.enable_multi_currency === 1) return true;

  // Build the update payload — also fix write_off_account if its currency
  // doesn't match the company default, since that blocks Company.save().
  const updates: Record<string, unknown> = { enable_multi_currency: 1 };

  if (company.write_off_account) {
    try {
      const acct = await frappe.getDoc<{ account_currency: string }>(
        "Account",
        company.write_off_account,
      );
      if (acct.account_currency !== company.default_currency) {
        updates.write_off_account = "";
      }
    } catch {
      // Can't read account — clear it to be safe
      updates.write_off_account = "";
    }
  }

  try {
    await frappe.updateDoc("Company", companyName, updates);
  } catch (err) {
    if (err instanceof FrappeAPIError && err.status === 403) {
      throw new Error(
        "Multi-currency is not enabled for this company. Please contact an administrator to enable it in ERPNext (Company Settings).",
      );
    }
    // Other validation errors should not block the JE. The JE's own
    // multi_currency field is what ERPNext uses for row-level exchange rates.
    console.warn(
      "[multi-currency] Could not auto-enable multi_currency on Company doc — proceeding anyway. Error:",
      err instanceof Error ? err.message : err,
    );
  }

  return true;
}

// ---------------------------------------------------------------------------
// Shared exchange rate lookup
// ---------------------------------------------------------------------------

/**
 * Fetch exchange rate: 1 fromCurrency = X toCurrency.
 * Tries direct pair first, then inverse. Returns null if not found.
 */
export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date: string,
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const records = await frappe.getList<{ exchange_rate: number }>("Currency Exchange", {
    filters: [
      ["from_currency", "=", fromCurrency],
      ["to_currency", "=", toCurrency],
      ["date", "<=", date],
    ],
    fields: ["exchange_rate"],
    orderBy: "date desc",
    limitPageLength: 1,
  });
  if (records.length > 0) return records[0].exchange_rate;

  // Try reverse pair and invert
  const reverse = await frappe.getList<{ exchange_rate: number }>("Currency Exchange", {
    filters: [
      ["from_currency", "=", toCurrency],
      ["to_currency", "=", fromCurrency],
      ["date", "<=", date],
    ],
    fields: ["exchange_rate"],
    orderBy: "date desc",
    limitPageLength: 1,
  });
  if (reverse.length > 0 && reverse[0].exchange_rate > 0) return 1 / reverse[0].exchange_rate;

  return null;
}

// ---------------------------------------------------------------------------
// JE account enrichment
// ---------------------------------------------------------------------------

interface EnrichOptions {
  /** When provided, auto-fetches exchange rates for foreign-currency rows missing them */
  date?: string;
}

interface EnrichResult {
  accounts: JournalEntryAccount[];
  isMultiCurrency: boolean;
}

/**
 * Defensively enriches JE account rows:
 * 1. Batch-fetches `account_currency` for any row missing it
 * 2. Defaults `exchange_rate: 1` for company-currency rows missing it
 * 3. Optionally fetches exchange rates for foreign-currency rows (when `date` provided)
 *
 * Idempotent — already-enriched rows pass through unchanged with no API calls.
 */
export async function enrichJEAccounts(
  accounts: JournalEntryAccount[],
  companyCurrency: string,
  options?: EnrichOptions,
): Promise<EnrichResult> {
  // Collect accounts missing currency
  const missingCurrency = new Set<string>();
  for (const row of accounts) {
    if (!row.account_currency && row.account) {
      missingCurrency.add(row.account);
    }
  }

  // Batch-fetch currencies in a single API call
  const currencyMap = new Map<string, string>();
  if (missingCurrency.size > 0) {
    const accountNames = [...missingCurrency];
    const docs = await frappe.getList<{ name: string; account_currency: string }>("Account", {
      filters: [["name", "in", accountNames]],
      fields: ["name", "account_currency"],
      limitPageLength: accountNames.length,
    });
    for (const doc of docs) {
      currencyMap.set(doc.name, doc.account_currency);
    }
  }

  // Enrich rows
  let isMultiCurrency = false;
  const enriched = await Promise.all(
    accounts.map(async (row) => {
      const currency = row.account_currency ?? currencyMap.get(row.account) ?? companyCurrency;
      if (currency !== companyCurrency) isMultiCurrency = true;

      let rate = row.exchange_rate;
      if (rate === undefined || rate === null) {
        if (currency === companyCurrency) {
          rate = 1;
        } else if (options?.date) {
          rate = (await fetchExchangeRate(currency, companyCurrency, options.date)) ?? 1;
        }
      }

      return {
        ...row,
        account_currency: currency,
        ...(rate !== undefined ? { exchange_rate: rate } : {}),
      };
    }),
  );

  return { accounts: enriched, isMultiCurrency };
}
