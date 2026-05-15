import { create } from "zustand";

interface PartnerState {
  selectedSalesInvoices: { name: string; amount: number }[];
  selectedPurchaseInvoices: { name: string; amount: number }[];
  offsetAmount: number;
  remainder: number;
  remainderDirection: "they_pay" | "we_pay" | "settled";

  toggleSalesInvoice: (name: string, amount: number) => void;
  togglePurchaseInvoice: (name: string, amount: number) => void;
  calculateOffset: () => void;
  clearSelection: () => void;
  selectAllSales: (invoices: { name: string; amount: number }[]) => void;
  selectAllPurchases: (invoices: { name: string; amount: number }[]) => void;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  selectedSalesInvoices: [],
  selectedPurchaseInvoices: [],
  offsetAmount: 0,
  remainder: 0,
  remainderDirection: "settled",

  toggleSalesInvoice: (name, amount) => {
    set((state) => {
      const exists = state.selectedSalesInvoices.find((i) => i.name === name);
      const updated = exists
        ? state.selectedSalesInvoices.filter((i) => i.name !== name)
        : [...state.selectedSalesInvoices, { name, amount }];
      return { selectedSalesInvoices: updated };
    });
    get().calculateOffset();
  },

  togglePurchaseInvoice: (name, amount) => {
    set((state) => {
      const exists = state.selectedPurchaseInvoices.find((i) => i.name === name);
      const updated = exists
        ? state.selectedPurchaseInvoices.filter((i) => i.name !== name)
        : [...state.selectedPurchaseInvoices, { name, amount }];
      return { selectedPurchaseInvoices: updated };
    });
    get().calculateOffset();
  },

  calculateOffset: () => {
    const { selectedSalesInvoices, selectedPurchaseInvoices } = get();
    const totalReceivable = selectedSalesInvoices.reduce((s, i) => s + i.amount, 0);
    const totalPayable = selectedPurchaseInvoices.reduce((s, i) => s + i.amount, 0);
    const offset = Math.min(totalReceivable, totalPayable);
    const diff = totalReceivable - totalPayable;

    set({
      offsetAmount: offset,
      remainder: Math.abs(diff),
      remainderDirection: diff > 0 ? "they_pay" : diff < 0 ? "we_pay" : "settled",
    });
  },

  clearSelection: () =>
    set({
      selectedSalesInvoices: [],
      selectedPurchaseInvoices: [],
      offsetAmount: 0,
      remainder: 0,
      remainderDirection: "settled",
    }),

  selectAllSales: (invoices) => {
    set({ selectedSalesInvoices: invoices });
    get().calculateOffset();
  },

  selectAllPurchases: (invoices) => {
    set({ selectedPurchaseInvoices: invoices });
    get().calculateOffset();
  },
}));
