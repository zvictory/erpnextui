import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { GLEntry } from "@/types/gl-entry";
import type { PartyBalances, CurrencyBalance } from "@/types/party-report";

async function fetchBalancesFromGL(
  partyType: "Customer" | "Supplier",
  company: string,
): Promise<Map<string, PartyBalances>> {
  const rows = await frappe.getList<{
    party: string;
    account_currency: string;
    total_debit_ac: number;
    total_credit_ac: number;
    total_debit: number;
    total_credit: number;
  }>("GL Entry", {
    filters: [
      ["party_type", "=", partyType],
      ["company", "=", company],
      ["is_cancelled", "=", 0],
    ],
    fields: [
      "party",
      "account_currency",
      { SUM: "debit_in_account_currency", as: "total_debit_ac" },
      { SUM: "credit_in_account_currency", as: "total_credit_ac" },
      { SUM: "debit", as: "total_debit" },
      { SUM: "credit", as: "total_credit" },
    ],
    groupBy: "party, account_currency",
    limitPageLength: 0,
  });

  const perParty = new Map<string, { byCurrency: Map<string, number>; baseTotal: number }>();
  for (const r of rows) {
    if (!perParty.has(r.party)) perParty.set(r.party, { byCurrency: new Map(), baseTotal: 0 });
    const p = perParty.get(r.party)!;
    p.byCurrency.set(r.account_currency, (r.total_debit_ac ?? 0) - (r.total_credit_ac ?? 0));
    p.baseTotal += (r.total_debit ?? 0) - (r.total_credit ?? 0);
  }

  const map = new Map<string, PartyBalances>();
  for (const [party, data] of perParty) {
    const balances: CurrencyBalance[] = Array.from(data.byCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .filter((b) => Math.abs(b.amount) > 0.005);
    map.set(party, { balances, totalInBaseCurrency: data.baseTotal });
  }
  return map;
}

export function useReceivableBalances(company: string) {
  const query = useQuery({
    queryKey: queryKeys.partyBalances.receivable(company),
    queryFn: () => fetchBalancesFromGL("Customer", company),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    balanceMap: query.data ?? new Map<string, PartyBalances>(),
  };
}

export function usePayableBalances(company: string) {
  const query = useQuery({
    queryKey: queryKeys.partyBalances.payable(company),
    queryFn: () => fetchBalancesFromGL("Supplier", company),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
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

const PARTY_LEDGER_PAGE_SIZE = 50;

export function usePartyLedger(partyType: string, party: string, company: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.partyLedger.list(partyType, party, company, page),
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
        limitPageLength: PARTY_LEDGER_PAGE_SIZE,
        limitStart: (page - 1) * PARTY_LEDGER_PAGE_SIZE,
      }),
    enabled: !!party && !!company,
  });
}

export function usePartyLedgerCount(partyType: string, party: string, company: string) {
  return useQuery({
    queryKey: queryKeys.partyLedger.count(partyType, party, company),
    queryFn: () =>
      frappe.getCount("GL Entry", [
        ["party_type", "=", partyType],
        ["party", "=", party],
        ["company", "=", company],
        ["is_cancelled", "=", 0],
      ]),
    enabled: !!party && !!company,
  });
}
