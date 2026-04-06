"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";

/** Workflow states for the Sales Order warehouse pipeline */
export const WORKFLOW_STATES = [
  "Draft",
  "Submitted",
  "Pending Pick",
  "Picking",
  "Stock Check",
  "Packed",
  "To Invoice",
  "Invoiced",
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];

/** Warehouse pipeline states (post-submission) */
export const WAREHOUSE_STATES: WorkflowState[] = [
  "Pending Pick",
  "Picking",
  "Stock Check",
  "Packed",
  "To Invoice",
];

interface WorkflowTransitionInput {
  doctype: string;
  docname: string;
  action: string;
}

/** Apply a workflow transition (e.g., Start Picking, Mark Packed) */
export function useWorkflowTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ doctype, docname, action }: WorkflowTransitionInput) => {
      return frappe.call<Record<string, unknown>>("frappe.model.workflow.apply_workflow", {
        doc: JSON.stringify({ doctype, name: docname }),
        action,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesOrders"] });
      qc.invalidateQueries({ queryKey: ["workflowCounts"] });
      qc.invalidateQueries({ queryKey: ["warehouseQueue"] });
    },
  });
}

/** Fetch Sales Orders filtered by workflow_state */
export function useOrdersByWorkflowState(
  company: string,
  state: WorkflowState | "",
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: ["salesOrders", "workflow", company, state, page],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (state) {
        filters.push(["workflow_state", "=", state]);
      }
      return frappe.getList<{
        name: string;
        customer: string;
        customer_name: string;
        transaction_date: string;
        delivery_date: string;
        grand_total: number;
        currency: string;
        workflow_state: string;
        creation: string;
        set_warehouse: string;
      }>("Sales Order", {
        filters,
        fields: [
          "name",
          "customer",
          "customer_name",
          "transaction_date",
          "delivery_date",
          "grand_total",
          "currency",
          "workflow_state",
          "creation",
          "set_warehouse",
        ],
        orderBy: "creation desc",
        limitPageLength: pageSize,
        limitStart: (page - 1) * pageSize,
      });
    },
    enabled: !!company,
  });
}

/** Count Sales Orders per workflow state (for pipeline dashboard) */
export function useWorkflowStateCounts(company: string) {
  return useQuery({
    queryKey: ["workflowCounts", company],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      const promises = WORKFLOW_STATES.map(async (state) => {
        const count = await frappe.getCount("Sales Order", [
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
    mutationFn: async (items: { item_code: string; warehouse: string; qty: number }[]) => {
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

/** Fetch warehouse queue — orders in a specific warehouse pipeline state */
export function useWarehouseQueue(company: string, state: WorkflowState) {
  return useQuery({
    queryKey: ["warehouseQueue", company, state],
    queryFn: () =>
      frappe.getList<{
        name: string;
        customer: string;
        customer_name: string;
        transaction_date: string;
        delivery_date: string;
        grand_total: number;
        currency: string;
        workflow_state: string;
        creation: string;
        set_warehouse: string;
      }>("Sales Order", {
        filters: [
          ["company", "=", company],
          ["workflow_state", "=", state],
          ["docstatus", "=", 1],
        ],
        fields: [
          "name",
          "customer",
          "customer_name",
          "transaction_date",
          "delivery_date",
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

interface UpdatePickedQtyInput {
  /** The Sales Order Item child row name (e.g. "a1b2c3d4e5") */
  rowName: string;
  pickedQty: number;
}

/** Update picked_qty on a Sales Order Item child row */
export function useUpdatePickedQty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rowName, pickedQty }: UpdatePickedQtyInput) => {
      return frappe.call<unknown>("frappe.client.set_value", {
        doctype: "Sales Order Item",
        name: rowName,
        fieldname: "picked_qty",
        value: pickedQty,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesOrders"] });
      qc.invalidateQueries({ queryKey: ["warehouseQueue"] });
    },
  });
}

/** Create a Sales Invoice from a Sales Order, save, and submit it via workflow if active */
export function useCreateInvoiceFromSO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (soName: string) => {
      // ERPNext standard API: creates a mapped SI draft from the SO
      const siDraft = await frappe.call<Record<string, unknown>>(
        "erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice",
        { source_name: soName },
      );
      // Save the draft SI
      const saved = await frappe.createDoc<{ name: string }>("Sales Invoice", siDraft);

      // Check if Sales Invoice has an active workflow
      const workflows = await frappe.getList<{ name: string }>("Workflow", {
        filters: [
          ["document_type", "=", "Sales Invoice"],
          ["is_active", "=", 1],
        ],
        fields: ["name"],
        limitPageLength: 1,
      });

      if (workflows.length > 0) {
        // Use workflow: get available transitions from Draft and apply the first one
        const transitions = await frappe.call<
          { action: string; next_state: string }[]
        >("frappe.model.workflow.get_transitions", {
          doc: JSON.stringify({
            doctype: "Sales Invoice",
            name: saved.name,
            workflow_state: "Draft",
          }),
        });
        const transitionList = Array.isArray(transitions) ? transitions : [];
        if (transitionList.length > 0) {
          await frappe.call("frappe.model.workflow.apply_workflow", {
            doc: JSON.stringify({ doctype: "Sales Invoice", name: saved.name }),
            action: transitionList[0].action,
          });
        }
      } else {
        // No workflow — direct submit
        const fullDoc = await frappe.getDoc<Record<string, unknown>>(
          "Sales Invoice",
          saved.name,
        );
        await frappe.submit(fullDoc);
      }

      return { siName: saved.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesOrders"] });
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
      qc.invalidateQueries({ queryKey: ["warehouseQueue"] });
      qc.invalidateQueries({ queryKey: ["workflowCounts"] });
      qc.invalidateQueries({ queryKey: ["workflow"] });
    },
  });
}
