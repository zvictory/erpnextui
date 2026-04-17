import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";

export interface CurrencyMismatch {
  doctype: "Payment Entry" | "Journal Entry" | "Sales Invoice" | "Purchase Invoice";
  name: string;
  posting_date: string;
  party?: string;
  currency?: string;
  expectedBase: number;
  actualBase: number;
  drift: number;
  field: string;
  rate: number;
  foreignAmount: number;
}

interface PaymentEntryRow {
  name: string;
  posting_date: string;
  party: string;
  paid_from_account_currency: string;
  paid_to_account_currency: string;
  paid_amount: number;
  received_amount: number;
  base_paid_amount: number;
  base_received_amount: number;
  source_exchange_rate: number;
  target_exchange_rate: number;
}

interface JournalEntryRow {
  name: string;
  posting_date: string;
  multi_currency: number;
  accounts: Array<{
    account: string;
    account_currency: string;
    debit_in_account_currency: number;
    credit_in_account_currency: number;
    debit: number;
    credit: number;
    exchange_rate: number;
  }>;
}

interface InvoiceRow {
  name: string;
  posting_date: string;
  customer?: string;
  supplier?: string;
  currency: string;
  conversion_rate: number;
  grand_total: number;
  base_grand_total: number;
}

const TOLERANCE = 0.01;

function checkPaymentEntries(rows: PaymentEntryRow[]): CurrencyMismatch[] {
  const mismatches: CurrencyMismatch[] = [];
  for (const r of rows) {
    if (r.source_exchange_rate && r.source_exchange_rate !== 1) {
      const expected = Math.round(r.paid_amount * r.source_exchange_rate * 100) / 100;
      if (Math.abs(expected - r.base_paid_amount) > TOLERANCE) {
        mismatches.push({
          doctype: "Payment Entry",
          name: r.name,
          posting_date: r.posting_date,
          party: r.party,
          currency: r.paid_from_account_currency,
          expectedBase: expected,
          actualBase: r.base_paid_amount,
          drift: r.base_paid_amount - expected,
          field: "base_paid_amount",
          rate: r.source_exchange_rate,
          foreignAmount: r.paid_amount,
        });
      }
    }
    if (r.target_exchange_rate && r.target_exchange_rate !== 1) {
      const expected = Math.round(r.received_amount * r.target_exchange_rate * 100) / 100;
      if (Math.abs(expected - r.base_received_amount) > TOLERANCE) {
        mismatches.push({
          doctype: "Payment Entry",
          name: r.name,
          posting_date: r.posting_date,
          party: r.party,
          currency: r.paid_to_account_currency,
          expectedBase: expected,
          actualBase: r.base_received_amount,
          drift: r.base_received_amount - expected,
          field: "base_received_amount",
          rate: r.target_exchange_rate,
          foreignAmount: r.received_amount,
        });
      }
    }
  }
  return mismatches;
}

function checkJournalEntries(rows: JournalEntryRow[]): CurrencyMismatch[] {
  const mismatches: CurrencyMismatch[] = [];
  for (const je of rows) {
    if (!je.multi_currency) continue;
    for (const acc of je.accounts) {
      const rate = acc.exchange_rate;
      if (!rate || rate === 1) continue;

      if (acc.debit_in_account_currency > 0) {
        const expected = Math.round(acc.debit_in_account_currency * rate * 100) / 100;
        if (Math.abs(expected - acc.debit) > TOLERANCE) {
          mismatches.push({
            doctype: "Journal Entry",
            name: je.name,
            posting_date: je.posting_date,
            currency: acc.account_currency,
            expectedBase: expected,
            actualBase: acc.debit,
            drift: acc.debit - expected,
            field: `${acc.account} (debit)`,
            rate,
            foreignAmount: acc.debit_in_account_currency,
          });
        }
      }
      if (acc.credit_in_account_currency > 0) {
        const expected = Math.round(acc.credit_in_account_currency * rate * 100) / 100;
        if (Math.abs(expected - acc.credit) > TOLERANCE) {
          mismatches.push({
            doctype: "Journal Entry",
            name: je.name,
            posting_date: je.posting_date,
            currency: acc.account_currency,
            expectedBase: expected,
            actualBase: acc.credit,
            drift: acc.credit - expected,
            field: `${acc.account} (credit)`,
            rate,
            foreignAmount: acc.credit_in_account_currency,
          });
        }
      }
    }
  }
  return mismatches;
}

function checkInvoices(
  doctype: "Sales Invoice" | "Purchase Invoice",
  rows: InvoiceRow[],
): CurrencyMismatch[] {
  const mismatches: CurrencyMismatch[] = [];
  for (const r of rows) {
    if (!r.conversion_rate || r.conversion_rate === 1) continue;
    const expected = Math.round(r.grand_total * r.conversion_rate * 100) / 100;
    if (Math.abs(expected - r.base_grand_total) > TOLERANCE) {
      mismatches.push({
        doctype,
        name: r.name,
        posting_date: r.posting_date,
        party: r.customer ?? r.supplier,
        currency: r.currency,
        expectedBase: expected,
        actualBase: r.base_grand_total,
        drift: r.base_grand_total - expected,
        field: "base_grand_total",
        rate: r.conversion_rate,
        foreignAmount: r.grand_total,
      });
    }
  }
  return mismatches;
}

export async function fetchCurrencyAudit(
  company: string,
  fromDate: string,
  toDate: string,
): Promise<CurrencyMismatch[]> {
  const dateFilter = [
    ["posting_date", ">=", fromDate],
    ["posting_date", "<=", toDate],
    ["company", "=", company],
    ["docstatus", "in", [0, 1]],
  ];

  const [payments, journalsRaw, sales, purchases] = await Promise.all([
    frappe.getList<PaymentEntryRow>("Payment Entry", {
      filters: dateFilter,
      fields: [
        "name",
        "posting_date",
        "party",
        "paid_from_account_currency",
        "paid_to_account_currency",
        "paid_amount",
        "received_amount",
        "base_paid_amount",
        "base_received_amount",
        "source_exchange_rate",
        "target_exchange_rate",
      ],
      limitPageLength: 0,
    }),
    frappe.getList<{ name: string; posting_date: string; multi_currency: number }>(
      "Journal Entry",
      {
        filters: [...dateFilter, ["multi_currency", "=", 1]],
        fields: ["name", "posting_date", "multi_currency"],
        limitPageLength: 0,
      },
    ),
    frappe.getList<InvoiceRow>("Sales Invoice", {
      filters: dateFilter,
      fields: [
        "name",
        "posting_date",
        "customer",
        "currency",
        "conversion_rate",
        "grand_total",
        "base_grand_total",
      ],
      limitPageLength: 0,
    }),
    frappe.getList<InvoiceRow>("Purchase Invoice", {
      filters: dateFilter,
      fields: [
        "name",
        "posting_date",
        "supplier",
        "currency",
        "conversion_rate",
        "grand_total",
        "base_grand_total",
      ],
      limitPageLength: 0,
    }),
  ]);

  const journalEntries: JournalEntryRow[] = await Promise.all(
    journalsRaw.map((j) => frappe.getDoc<JournalEntryRow>("Journal Entry", j.name)),
  );

  return [
    ...checkPaymentEntries(payments),
    ...checkJournalEntries(journalEntries),
    ...checkInvoices("Sales Invoice", sales),
    ...checkInvoices("Purchase Invoice", purchases),
  ].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
}

export function useCurrencyAudit(company: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["currency-audit", company, fromDate, toDate],
    queryFn: () => fetchCurrencyAudit(company, fromDate, toDate),
    enabled: !!company && !!fromDate && !!toDate,
    staleTime: 60_000,
  });
}
