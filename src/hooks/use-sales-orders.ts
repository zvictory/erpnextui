import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { SalesOrder, SalesOrderListItem } from "@/types/sales-order";
import type { SalesOrderFormValues } from "@/lib/schemas/sales-order-schema";

const PAGE_SIZE = 20;

export function useSalesOrderList(
  company: string,
  page: number,
  search: string,
  sort: string,
  extraFilters?: unknown[],
) {
  return useQuery({
    queryKey: [...queryKeys.salesOrders.list(company, page, search, sort), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["customer_name", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getList<SalesOrderListItem>("Sales Order", {
        filters,
        fields: [
          "name",
          "customer",
          "customer_name",
          "transaction_date",
          "grand_total",
          "currency",
          "status",
          "docstatus",
          "per_billed",
          "per_delivered",
        ],
        orderBy: sort || "transaction_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useSalesOrderCount(company: string, search: string, extraFilters?: unknown[]) {
  return useQuery({
    queryKey: [...queryKeys.salesOrders.count(company, search), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["customer_name", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getCount("Sales Order", filters);
    },
    enabled: !!company,
  });
}

export function useSalesOrder(name: string) {
  return useQuery({
    queryKey: queryKeys.salesOrders.detail(name),
    queryFn: () => frappe.getDoc<SalesOrder>("Sales Order", name),
    enabled: !!name,
  });
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SalesOrderFormValues & { company: string }) =>
      frappe.createDoc<SalesOrder>("Sales Order", {
        doctype: "Sales Order",
        ...data,
        items: data.items.map((item) => ({
          doctype: "Sales Order Item",
          ...item,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesOrders"] });
    },
  });
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<SalesOrderFormValues> }) => {
      const doc = await frappe.getDoc<SalesOrder>("Sales Order", name);
      return frappe.save<SalesOrder>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
        ...(data.items
          ? {
              items: data.items.map((item) => ({
                doctype: "Sales Order Item",
                ...item,
              })),
            }
          : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesOrders"] });
    },
  });
}

export function useSubmitSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<SalesOrder>("Sales Order", name);
      return frappe.submit<SalesOrder>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (updatedDoc) => {
      qc.setQueryData(queryKeys.salesOrders.detail(updatedDoc.name), updatedDoc);
      qc.invalidateQueries({ queryKey: ["salesOrders"] });
    },
  });
}

export function useCancelSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Sales Order", name),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["salesOrders"] });
    },
  });
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Sales Order", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesOrders"] });
    },
  });
}
