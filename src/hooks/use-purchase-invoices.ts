import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { PurchaseInvoice, PurchaseInvoiceListItem } from "@/types/purchase-invoice";
import type { PurchaseInvoiceFormValues } from "@/lib/schemas/purchase-invoice-schema";

const PAGE_SIZE = 20;

export function usePurchaseInvoiceList(
  company: string,
  page: number,
  search: string,
  sort: string,
  extraFilters?: unknown[],
) {
  return useQuery({
    queryKey: [...queryKeys.purchaseInvoices.list(company, page, search, sort), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["supplier", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getList<PurchaseInvoiceListItem>("Purchase Invoice", {
        filters,
        fields: [
          "name",
          "supplier",
          "posting_date",
          "grand_total",
          "currency",
          "status",
          "docstatus",
          "is_return",
        ],
        orderBy: sort || "posting_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function usePurchaseInvoiceCount(company: string, search: string, extraFilters?: unknown[]) {
  return useQuery({
    queryKey: [...queryKeys.purchaseInvoices.count(company, search), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["supplier", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getCount("Purchase Invoice", filters);
    },
    enabled: !!company,
  });
}

export function usePurchaseInvoice(name: string) {
  return useQuery({
    queryKey: queryKeys.purchaseInvoices.detail(name),
    queryFn: () => frappe.getDoc<PurchaseInvoice>("Purchase Invoice", name),
    enabled: !!name,
  });
}

export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: PurchaseInvoiceFormValues & { company: string; is_return?: 1; return_against?: string },
    ) =>
      frappe.createDoc<PurchaseInvoice>("Purchase Invoice", {
        doctype: "Purchase Invoice",
        ...data,
        bill_date: data.posting_date,
        items: data.items.map((item) => ({
          doctype: "Purchase Invoice Item",
          ...item,
          // Service lines: use description as item_name for ERPNext
          ...(!item.item_code && item.description
            ? { item_name: item.description, item_code: undefined }
            : {}),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
    },
  });
}

export function useUpdatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      data,
    }: {
      name: string;
      data: Partial<PurchaseInvoiceFormValues>;
    }) => {
      const doc = await frappe.getDoc<PurchaseInvoice>("Purchase Invoice", name);
      return frappe.save<PurchaseInvoice>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
        ...(data.posting_date ? { bill_date: data.posting_date } : {}),
        ...(data.items
          ? {
              items: data.items.map((item) => ({
                doctype: "Purchase Invoice Item",
                ...item,
                ...(!item.item_code && item.description
                  ? { item_name: item.description, item_code: undefined }
                  : {}),
              })),
            }
          : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
    },
  });
}

export function useSubmitPurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<PurchaseInvoice>("Purchase Invoice", name);
      return frappe.submit<PurchaseInvoice>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
    },
  });
}

export function useCancelPurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Purchase Invoice", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
    },
  });
}

export function useDeletePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Purchase Invoice", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
    },
  });
}
