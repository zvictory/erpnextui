import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { PurchaseOrder, PurchaseOrderListItem } from "@/types/purchase-order";
import type { PurchaseOrderFormValues } from "@/lib/schemas/purchase-order-schema";

const PAGE_SIZE = 20;

export function usePurchaseOrderList(
  company: string,
  page: number,
  search: string,
  sort: string,
  extraFilters?: unknown[],
) {
  return useQuery({
    queryKey: [...queryKeys.purchaseOrders.list(company, page, search, sort), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["supplier", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getList<PurchaseOrderListItem>("Purchase Order", {
        filters,
        fields: [
          "name",
          "supplier",
          "transaction_date",
          "grand_total",
          "currency",
          "status",
          "docstatus",
          "per_billed",
          "per_received",
        ],
        orderBy: sort || "transaction_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function usePurchaseOrderCount(company: string, search: string, extraFilters?: unknown[]) {
  return useQuery({
    queryKey: [...queryKeys.purchaseOrders.count(company, search), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["supplier", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getCount("Purchase Order", filters);
    },
    enabled: !!company,
  });
}

export function usePurchaseOrder(name: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(name),
    queryFn: () => frappe.getDoc<PurchaseOrder>("Purchase Order", name),
    enabled: !!name,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseOrderFormValues & { company: string }) =>
      frappe.createDoc<PurchaseOrder>("Purchase Order", {
        doctype: "Purchase Order",
        ...data,
        items: data.items.map((item) => ({
          doctype: "Purchase Order Item",
          ...item,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      data,
    }: {
      name: string;
      data: Partial<PurchaseOrderFormValues>;
    }) => {
      const doc = await frappe.getDoc<PurchaseOrder>("Purchase Order", name);
      return frappe.save<PurchaseOrder>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
        ...(data.items
          ? {
              items: data.items.map((item) => ({
                doctype: "Purchase Order Item",
                ...item,
              })),
            }
          : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
}

export function useSubmitPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<PurchaseOrder>("Purchase Order", name);
      return frappe.submit<PurchaseOrder>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Purchase Order", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Purchase Order", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
}
