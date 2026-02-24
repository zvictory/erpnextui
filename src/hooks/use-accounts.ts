"use client";

import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Account } from "@/types/account";

export function useBankAccounts(company: string) {
  return useQuery({
    queryKey: queryKeys.accounts.bank(company),
    queryFn: async () => {
      const accounts = await frappe.getList<Account>("Account", {
        filters: [
          ["account_type", "in", ["Bank", "Cash"]],
          ["is_group", "=", 0],
          ["disabled", "=", 0],
          ["company", "=", company],
        ],
        fields: ["name"],
      });
      return accounts.map((a) => a.name);
    },
    enabled: !!company,
  });
}

export function useExpenseAccounts(company: string) {
  return useQuery({
    queryKey: queryKeys.accounts.expense(company),
    queryFn: async () => {
      const accounts = await frappe.getList<Account>("Account", {
        filters: [
          ["account_type", "in", ["Expense Account", "Cost of Goods Sold"]],
          ["is_group", "=", 0],
          ["disabled", "=", 0],
          ["company", "=", company],
        ],
        fields: ["name"],
      });
      return accounts.map((a) => a.name);
    },
    enabled: !!company,
  });
}
