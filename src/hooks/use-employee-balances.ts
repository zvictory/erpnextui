import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { PartyBalances, CurrencyBalance } from "@/types/party-report";

// Persisted shape: plain Record so JSON round-trip through localStorage keeps
// .get/.has callable downstream (Map serializes to {} and breaks consumers).
type EmployeeBalancesByName = Record<string, PartyBalances>;

export function useEmployeeGLBalances(company: string) {
  const query = useQuery({
    queryKey: queryKeys.partyBalances.employee(company),
    queryFn: async (): Promise<EmployeeBalancesByName> => {
      const rows = await frappe.getList<{
        party: string;
        account_currency: string;
        total_debit_ac: number;
        total_credit_ac: number;
        total_debit: number;
        total_credit: number;
      }>("GL Entry", {
        filters: [
          ["party_type", "=", "Employee"],
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

      const out: EmployeeBalancesByName = {};
      for (const [party, data] of perParty) {
        const balances: CurrencyBalance[] = Array.from(data.byCurrency.entries())
          .map(([currency, amount]) => ({ currency, amount }))
          .filter((b) => Math.abs(b.amount) > 0.005);
        out[party] = { balances, totalInBaseCurrency: data.baseTotal };
      }
      return out;
    },
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });

  const balanceMap = useMemo(
    () => new Map<string, PartyBalances>(Object.entries(query.data ?? {})),
    [query.data],
  );

  return {
    balanceMap,
    isLoading: query.isLoading,
  };
}
