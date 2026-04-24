import { PERSIST_KEY, queryClient } from "@/components/providers/query-provider";
import { disconnectRealtime } from "@/lib/frappe-realtime";
import { useCompanyStore } from "@/stores/company-store";
import { useReceiptSettingsStore } from "@/stores/receipt-settings-store";

/**
 * Clears all tenant-specific state: Zustand persisted stores and React Query
 * cache (in-memory + localStorage). Call on logout and when switching to a
 * different tenant (siteUrl change).
 */
export function clearTenantState() {
  useCompanyStore.setState({
    company: "",
    currencySymbol: "$",
    symbolOnRight: false,
    currencyCode: "",
  });

  useReceiptSettingsStore.setState({
    headerLine1: "",
    headerLine2: "",
    headerLine3: "",
    paperWidth: "80mm",
    fontSize: "medium",
    showQrCode: false,
    showCustomerName: true,
    showDueDate: false,
    showItemRate: false,
    itemDisplay: "code",
    showItemUom: false,
    footerText: "Thank you for your business!",
  });

  disconnectRealtime();
  queryClient.clear();

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(PERSIST_KEY);
    } catch {
      // localStorage can throw in privacy modes — non-fatal.
    }
  }
}
