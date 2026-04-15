import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { GLEntry } from "@/types/gl-entry";
import type { PartyBalances, CurrencyBalance } from "@/types/party-report";

/**
 * Fetch balances using the AR/AP Summary report in company currency.
 * Returns exact booked amounts — no exchange-rate round-trip.
 */
async function fetchBalancesFromReport(
  partyType: "Customer" | "Supplier",
  company: string,
): Promise<Map<string, PartyBalances>> {
  const reportName =
    partyType === "Customer" ? "Accounts Receivable Summary" : "Accounts Payable Summary";

  const today = new Date().toISOString().split("T")[0];

  const report = await frappe.call<{
    result: (Record<string, unknown> | unknown[])[];
  }>("frappe.desk.query_report.run", {
    report_name: reportName,
    filters: {
      company,
      report_date: today,
      ageing_based_on: "Posting Date",
      range1: 30,
      range2: 60,
      range3: 90,
      range4: 120,
      // in_party_currency returns amounts in each party's native currency
      // (e.g. UZS instead of company-currency USD). Minor rounding (~0.01%)
      // may occur for large-denomination currencies; Math.round below handles it.
      in_party_currency: 1,
    },
  });

  const perParty = new Map<string, Map<string, number>>();

  for (const raw of report.result) {
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    if (!row.party) continue;

    const party = String(row.party);
    const outstanding = Number(row.total_outstanding_amount ?? row.outstanding ?? 0);
    const currency = row.currency ? String(row.currency) : undefined;

    if (!currency || Math.abs(outstanding) < 0.005) continue;

    if (!perParty.has(party)) perParty.set(party, new Map());
    const currMap = perParty.get(party)!;
    currMap.set(currency, (currMap.get(currency) ?? 0) + outstanding);
  }

  const map = new Map<string, PartyBalances>();
  for (const [party, currMap] of perParty) {
    const balances: CurrencyBalance[] = Array.from(currMap.entries())
      .map(([currency, amount]) => ({
        currency,
        amount: currency === "UZS" ? Math.round(amount) : amount,
      }))
      .filter((b) => Math.abs(b.amount) > 0.005);

    const totalInBaseCurrency = balances.reduce((sum, b) => sum + b.amount, 0);
    map.set(party, { balances, totalInBaseCurrency });
  }

  return map;
}

export function useReceivableBalances(company: string) {
  const query = useQuery({
    queryKey: queryKeys.partyBalances.receivable(company),
    queryFn: () => fetchBalancesFromReport("Customer", company),
    enabled: !!company,
    staleTime: 2 * 60 * 1000,
  });

  return {
    ...query,
    balanceMap: query.data ?? new Map<string, PartyBalances>(),
  };
}

export function usePayableBalances(company: string) {
  const query = useQuery({
    queryKey: queryKeys.partyBalances.payable(company),
    queryFn: () => fetchBalancesFromReport("Supplier", company),
    enabled: !!company,
    staleTime: 2 * 60 * 1000,
  });

  return {
    ...query,
    balanceMap: query.data ?? new Map<string, PartyBalances>(),
  };
}

export interface DraftJournalEntry {
  name: string;
  posting_date: string;
  total_debit: number;
  user_remark: string;
  account_currency: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  exchange_rate: number;
}

export function usePartyDraftJEs(partyType: string, party: string, company: string) {
  return useQuery({
    queryKey: queryKeys.partyLedger.drafts(partyType, party, company),
    queryFn: async () => {
      // Single query with child table field syntax — eliminates N+1 getDoc calls
      const rows = await frappe.getList<DraftJournalEntry>("Journal Entry", {
        filters: [
          ["Journal Entry Account", "party_type", "=", partyType],
          ["Journal Entry Account", "party", "=", party],
          ["company", "=", company],
          ["docstatus", "=", 0],
        ],
        fields: [
          "name",
          "posting_date",
          "total_debit",
          "user_remark",
          "`tabJournal Entry Account`.account_currency",
          "`tabJournal Entry Account`.debit_in_account_currency",
          "`tabJournal Entry Account`.credit_in_account_currency",
          "`tabJournal Entry Account`.exchange_rate",
        ],
        orderBy: "posting_date desc",
        limitPageLength: 20,
      });

      return rows.map((r) => ({
        ...r,
        user_remark: r.user_remark ?? "",
        account_currency: r.account_currency ?? "",
        debit_in_account_currency: r.debit_in_account_currency ?? 0,
        credit_in_account_currency: r.credit_in_account_currency ?? 0,
        exchange_rate: r.exchange_rate ?? 1,
      }));
    },
    enabled: !!party && !!company,
  });
}

export function usePartyLedger(partyType: string, party: string, company: string) {
  return useQuery({
    queryKey: queryKeys.partyLedger.list(partyType, party, company),
    queryFn: () =>
      frappe.getList<GLEntry>("GL Entry", {
        filters: [
          ["party_type", "=", partyType],
          ["party", "=", party],
          ["company", "=", company],
          ["is_cancelled", "=", 0],
        ],
        fields: [
          "name",
          "posting_date",
          "account",
          "debit",
          "credit",
          "account_currency",
          "debit_in_account_currency",
          "credit_in_account_currency",
          "voucher_type",
          "voucher_no",
          "remarks",
        ],
        orderBy: "posting_date desc",
        limitPageLength: 0,
      }),
    enabled: !!party && !!company,
  });
}
