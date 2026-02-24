"use client";

import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Account } from "@/types/account";

export function useExpenseGroups(company: string) {
  return useQuery({
    queryKey: queryKeys.accounts.expenseGroups(company),
    queryFn: async () => {
      const accounts = await frappe.getList<Account>("Account", {
        filters: [
          ["root_type", "=", "Expense"],
          ["is_group", "=", 1],
          ["company", "=", company],
        ],
        fields: ["name"],
        orderBy: "name asc",
      });
      return accounts.map((a) => a.name);
    },
    enabled: !!company,
  });
}
