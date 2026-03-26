"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";

export interface UnreconciledEntry {
  name: string;
  posting_date: string;
  voucher_type: string;
  voucher_no: string;
  debit: number;
  credit: number;
  against: string;
  remarks: string;
}

export function useUnreconciledEntries(account: string, toDate: string) {
  return useQuery({
    queryKey: queryKeys.bankReconciliation.unreconciled(account, toDate),
    queryFn: () =>
      frappe.getList<UnreconciledEntry>("GL Entry", {
        filters: [
          ["account", "=", account],
          ["is_cancelled", "=", 0],
          ["posting_date", "<=", toDate],
          ["clearance_date", "is", "not set"],
        ],
        fields: [
          "name",
          "posting_date",
          "voucher_type",
          "voucher_no",
          "debit",
          "credit",
          "against",
          "remarks",
        ],
        orderBy: "posting_date asc",
        limitPageLength: 200,
      }),
    enabled: !!account && !!toDate,
  });
}

export function useReconcileEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entries,
      clearanceDate,
    }: {
      entries: string[];
      clearanceDate: string;
    }) => {
      await Promise.all(
        entries.map((name) =>
          frappe.call("frappe.client.set_value", {
            doctype: "GL Entry",
            name,
            fieldname: "clearance_date",
            value: clearanceDate,
          }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bankReconciliation"] });
      qc.invalidateQueries({ queryKey: ["glEntries"] });
    },
  });
}
