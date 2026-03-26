import { create } from "zustand";
import { frappe } from "@/lib/frappe-client";

interface WarehouseState {
  selectedWarehouse: string;
  counts: Record<string, number>;
  isLoading: boolean;
  setWarehouse: (wh: string) => void;
  refreshCounts: (company: string) => Promise<void>;
}

const WORKFLOW_STATES = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Ready for Pickup",
  "Picked",
  "Packed",
  "Delivered",
  "Completed",
];

export const useWarehouseStore = create<WarehouseState>((set) => ({
  selectedWarehouse: "Main Warehouse",
  counts: {},
  isLoading: false,
  setWarehouse: (wh) => set({ selectedWarehouse: wh }),
  refreshCounts: async (company: string) => {
    set({ isLoading: true });
    try {
      const results: Record<string, number> = {};
      await Promise.all(
        WORKFLOW_STATES.map(async (state) => {
          const count = await frappe.getCount("Sales Invoice", [
            ["company", "=", company],
            ["workflow_state", "=", state],
            ["docstatus", "<", 2],
          ]);
          results[state] = count;
        }),
      );
      set({ counts: results, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
