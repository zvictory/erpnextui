import { queryClient } from "@/components/providers/query-provider";
import { useCompanyStore } from "@/stores/company-store";
import { useReceiptSettingsStore } from "@/stores/receipt-settings-store";

/**
 * Clears all tenant-specific state: Zustand persisted stores and React Query cache.
 * Call on logout and when switching to a different tenant (siteUrl change).
 */
export function clearTenantState() {
  // Reset company store to defaults (in-memory + persisted localStorage)
  useCompanyStore.setState({
    company: "",
    currencySymbol: "$",
    symbolOnRight: false,
    currencyCode: "",
  });

  // Reset receipt settings to defaults
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

  // Wipe all React Query cache (removes every query from memory)
  queryClient.clear();
}
