import { frappe } from "./frappe-client";
import { FrappeAPIError } from "./frappe-types";

interface CompanyDoc {
  name: string;
  enable_multi_currency: 0 | 1;
  default_currency: string;
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

  try {
    await frappe.updateDoc("Company", companyName, { enable_multi_currency: 1 });
  } catch (err) {
    if (err instanceof FrappeAPIError && err.status === 403) {
      throw new Error(
        "Multi-currency is not enabled for this company. Please contact an administrator to enable it in ERPNext (Company Settings).",
      );
    }
    // Validation errors (e.g. write_off_account currency mismatch) should not
    // block the JE. The JE's own multi_currency field is what ERPNext uses for
    // row-level exchange rates; the Company flag is a secondary UI preference.
    console.warn(
      "[multi-currency] Could not auto-enable multi_currency on Company doc — proceeding anyway. Error:",
      err instanceof Error ? err.message : err,
    );
  }

  return true;
}
