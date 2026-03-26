import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaperWidth = "80mm" | "58mm";
export type ReceiptFontSize = "small" | "medium" | "large";
export type ItemDisplay = "code" | "name" | "both";

interface ReceiptSettingsState {
  // Header
  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  // Layout
  paperWidth: PaperWidth;
  fontSize: ReceiptFontSize;
  showQrCode: boolean;
  showCustomerName: boolean;
  showDueDate: boolean;
  showItemRate: boolean;
  itemDisplay: ItemDisplay;
  showItemUom: boolean;
  // Footer
  footerText: string;
  // Setters
  setHeaderLine1: (v: string) => void;
  setHeaderLine2: (v: string) => void;
  setHeaderLine3: (v: string) => void;
  setPaperWidth: (v: PaperWidth) => void;
  setFontSize: (v: ReceiptFontSize) => void;
  setShowQrCode: (v: boolean) => void;
  setShowCustomerName: (v: boolean) => void;
  setShowDueDate: (v: boolean) => void;
  setShowItemRate: (v: boolean) => void;
  setItemDisplay: (v: ItemDisplay) => void;
  setShowItemUom: (v: boolean) => void;
  setFooterText: (v: string) => void;
}

export const useReceiptSettingsStore = create<ReceiptSettingsState>()(
  persist(
    (set) => ({
      headerLine1: "",
      headerLine2: "",
      headerLine3: "",
      paperWidth: "80mm",
      fontSize: "medium",
      showQrCode: false,
      showCustomerName: true,
      showDueDate: false,
      showItemRate: false,
      itemDisplay: "name" as ItemDisplay,
      showItemUom: false,
      footerText: "",
      setHeaderLine1: (headerLine1) => set({ headerLine1 }),
      setHeaderLine2: (headerLine2) => set({ headerLine2 }),
      setHeaderLine3: (headerLine3) => set({ headerLine3 }),
      setPaperWidth: (paperWidth) => set({ paperWidth }),
      setFontSize: (fontSize) => set({ fontSize }),
      setShowQrCode: (showQrCode) => set({ showQrCode }),
      setShowCustomerName: (showCustomerName) => set({ showCustomerName }),
      setShowDueDate: (showDueDate) => set({ showDueDate }),
      setShowItemRate: (showItemRate) => set({ showItemRate }),
      setItemDisplay: (itemDisplay) => set({ itemDisplay }),
      setShowItemUom: (showItemUom) => set({ showItemUom }),
      setFooterText: (footerText) => set({ footerText }),
    }),
    {
      name: "erpnext-receipt-settings",
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          state.footerText = "";
        }
        if (version < 3) {
          state.itemDisplay = "name";
        }
        return state;
      },
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ReceiptSettingsState>),
      }),
    },
  ),
);
