"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";

/** Workflow states for the Sales Invoice approval pipeline */
export const WORKFLOW_STATES = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Ready for Pickup",
  "Picked",
  "Packed",
  "Delivered",
  "Completed",
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];

/** Warehouse pipeline states (post-approval) */
export const WAREHOUSE_STATES: WorkflowState[] = [
  "Ready for Pickup",
  "Picked",
  "Packed",
  "Delivered",
];

interface WorkflowTransitionInput {
  doctype: string;
  docname: string;
  action: string;
}

/** Apply a workflow transition (e.g., Approve, Reject, Mark as Picked) */
export function useWorkflowTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ doctype, docname, action }: WorkflowTransitionInput) => {
      return frappe.call<Record<string, unknown>>(
        "frappe.model.workflow.apply_workflow",
        {
          doc: JSON.stringify({ doctype, name: docname }),
          action,
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
      qc.invalidateQueries({ queryKey: ["workflowCounts"] });
      qc.invalidateQueries({ queryKey: ["warehouseQueue"] });
    },
  });
}

/** Fetch Sales Invoices filtered by workflow_state */
export function useInvoicesByWorkflowState(
  company: string,
  state: WorkflowState | "",
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: ["salesInvoices", "workflow", company, state, page],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (state) {
        filters.push(["workflow_state", "=", state]);
      }
      return frappe.getList<{
        name: string;
        customer: string;
        customer_name: string;
        posting_date: string;
        grand_total: number;
        currency: string;
        workflow_state: string;
        creation: string;
      }>("Sales Invoice", {
        filters,
        fields: [
          "name",
          "customer",
          "customer_name",
          "posting_date",
          "grand_total",
          "currency",
          "workflow_state",
          "creation",
        ],
        orderBy: "creation desc",
        limitPageLength: pageSize,
        limitStart: (page - 1) * pageSize,
      });
    },
    enabled: !!company,
  });
}

/** Count Sales Invoices per workflow state (for pipeline dashboard) */
export function useWorkflowStateCounts(company: string) {
  return useQuery({
    queryKey: ["workflowCounts", company],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      // Fetch counts for each state
      const promises = WORKFLOW_STATES.map(async (state) => {
        const count = await frappe.getCount("Sales Invoice", [
          ["company", "=", company],
          ["workflow_state", "=", state],
          ["docstatus", "<", 2], // exclude cancelled
        ]);
        counts[state] = count;
      });
      await Promise.all(promises);
      return counts;
    },
    enabled: !!company,
    staleTime: 30 * 1000, // 30s — dashboard refreshes frequently
  });
}

/** Check stock availability for a list of items */
export function useStockCheck() {
  return useMutation({
    mutationFn: async (
      items: { item_code: string; warehouse: string; qty: number }[],
    ) => {
      const results: {
        item_code: string;
        warehouse: string;
        required: number;
        available: number;
        sufficient: boolean;
      }[] = [];

      for (const item of items) {
        const data = await frappe.getList<{ actual_qty: number }>("Bin", {
          filters: [
            ["item_code", "=", item.item_code],
            ["warehouse", "=", item.warehouse],
          ],
          fields: ["actual_qty"],
          limitPageLength: 1,
        });
        const available = data[0]?.actual_qty ?? 0;
        results.push({
          item_code: item.item_code,
          warehouse: item.warehouse,
          required: item.qty,
          available,
          sufficient: available >= item.qty,
        });
      }
      return results;
    },
  });
}

/** Fetch warehouse queue — invoices in a specific post-approval state */
export function useWarehouseQueue(company: string, state: WorkflowState) {
  return useQuery({
    queryKey: ["warehouseQueue", company, state],
    queryFn: () =>
      frappe.getList<{
        name: string;
        customer: string;
        customer_name: string;
        posting_date: string;
        grand_total: number;
        currency: string;
        workflow_state: string;
        creation: string;
        set_warehouse: string;
      }>("Sales Invoice", {
        filters: [
          ["company", "=", company],
          ["workflow_state", "=", state],
          ["docstatus", "=", 1],
        ],
        fields: [
          "name",
          "customer",
          "customer_name",
          "posting_date",
          "grand_total",
          "currency",
          "workflow_state",
          "creation",
          "set_warehouse",
        ],
        orderBy: "creation asc", // FIFO for warehouse staff
        limitPageLength: 50,
      }),
    enabled: !!company,
    refetchInterval: 30 * 1000, // auto-refresh every 30s for warehouse screens
  });
}
