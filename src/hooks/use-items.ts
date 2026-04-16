import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Item, ItemListItem } from "@/types/item";
import type { ItemFormValues } from "@/lib/schemas/item-schema";

const PAGE_SIZE = 20;

/** Returns item_codes that have stock in a specific warehouse. */
export function useWarehouseItemCodes(warehouse: string) {
  return useQuery({
    queryKey: ["warehouseItemCodes", warehouse],
    queryFn: async () => {
      const bins = await frappe.getList<{ item_code: string }>("Bin", {
        filters: [
          ["warehouse", "=", warehouse],
          ["actual_qty", ">", 0],
        ],
        fields: ["item_code"],
        limitPageLength: 0,
      });
      return bins.map((b) => b.item_code);
    },
    enabled: !!warehouse,
    staleTime: 30_000,
  });
}

/** Batch-fetch total stock qty per item for a list of item codes. */
export function useItemStockTotals(itemCodes: string[]) {
  return useQuery({
    queryKey: ["itemStockTotals", ...itemCodes],
    queryFn: async () => {
      if (!itemCodes.length) return new Map<string, number>();
      const bins = await frappe.getList<{
        item_code: string;
        total_qty: number;
      }>("Bin", {
        filters: [["item_code", "in", itemCodes]],
        fields: ["item_code", { SUM: "actual_qty", as: "total_qty" }],
        groupBy: "item_code",
        limitPageLength: 0,
      });
      return new Map(bins.map((b) => [b.item_code, b.total_qty ?? 0]));
    },
    enabled: itemCodes.length > 0,
    staleTime: 30_000,
  });
}

export function useItemList(page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.items.list(page, search, sort),
    queryFn: () =>
      frappe.getList<ItemListItem>("Item", {
        orFilters: search
          ? [
              ["item_code", "like", `%${search}%`],
              ["item_name", "like", `%${search}%`],
            ]
          : undefined,
        fields: [
          "name",
          "item_code",
          "item_name",
          "item_group",
          "standard_rate",
          "has_serial_no",
          "disabled",
        ],
        orderBy: sort || "item_code asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useItemCount(search: string) {
  return useQuery({
    queryKey: queryKeys.items.count(search),
    queryFn: () => frappe.getCount("Item", search ? [["item_name", "like", `%${search}%`]] : []),
  });
}

export function useItem(name: string) {
  return useQuery({
    queryKey: queryKeys.items.detail(name),
    queryFn: () => frappe.getDoc<Item>("Item", name),
    enabled: !!name,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ItemFormValues) =>
      frappe.createDoc<Item>("Item", {
        doctype: "Item",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<ItemFormValues> }) => {
      const doc = await frappe.getDoc<Item>("Item", name);
      return frappe.save<Item>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Item", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// ── Product Detail Hooks ────────────────────────────────────

export interface PurchaseHistoryItem {
  parent: string;
  posting_date: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
  supplier_name: string;
}

export interface SalesHistoryItem {
  parent: string;
  posting_date: string;
  qty: number;
  rate: number;
  amount: number;
  customer_name: string;
  warehouse: string;
}

export function usePurchaseHistory(itemCode: string, page: number) {
  return useQuery({
    queryKey: queryKeys.items.purchaseHistory(itemCode, page),
    queryFn: () =>
      frappe.getList<PurchaseHistoryItem>("Purchase Invoice Item", {
        filters: [["item_code", "=", itemCode]],
        fields: ["parent", "posting_date", "qty", "rate", "amount", "warehouse", "supplier_name"],
        orderBy: "posting_date desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
    enabled: !!itemCode,
  });
}

export function usePurchaseHistoryCount(itemCode: string) {
  return useQuery({
    queryKey: queryKeys.items.purchaseHistoryCount(itemCode),
    queryFn: () => frappe.getCount("Purchase Invoice Item", [["item_code", "=", itemCode]]),
    enabled: !!itemCode,
  });
}

export function useSalesHistory(itemCode: string, page: number) {
  return useQuery({
    queryKey: queryKeys.items.salesHistory(itemCode, page),
    queryFn: () =>
      frappe.getList<SalesHistoryItem>("Sales Invoice Item", {
        filters: [["item_code", "=", itemCode]],
        fields: ["parent", "posting_date", "qty", "rate", "amount", "customer_name", "warehouse"],
        orderBy: "posting_date desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
    enabled: !!itemCode,
  });
}

export function useSalesHistoryCount(itemCode: string) {
  return useQuery({
    queryKey: queryKeys.items.salesHistoryCount(itemCode),
    queryFn: () => frappe.getCount("Sales Invoice Item", [["item_code", "=", itemCode]]),
    enabled: !!itemCode,
  });
}

export function useItemWorkOrders(itemCode: string) {
  return useQuery({
    queryKey: queryKeys.items.workOrders(itemCode),
    queryFn: () =>
      frappe.getList<{
        name: string;
        qty: number;
        produced_qty: number;
        status: string;
        planned_start_date: string;
      }>("Work Order", {
        filters: [["production_item", "=", itemCode]],
        fields: ["name", "qty", "produced_qty", "status", "planned_start_date"],
        orderBy: "planned_start_date desc",
        limitPageLength: 20,
      }),
    enabled: !!itemCode,
  });
}

export function useItemActiveBom(itemCode: string) {
  return useQuery({
    queryKey: queryKeys.items.activeBom(itemCode),
    queryFn: () =>
      frappe.getList<{
        name: string;
        quantity: number;
        total_cost: number;
        raw_material_cost: number;
        operating_cost: number;
        is_default: number;
      }>("BOM", {
        filters: [
          ["item", "=", itemCode],
          ["is_active", "=", 1],
        ],
        fields: [
          "name",
          "quantity",
          "total_cost",
          "raw_material_cost",
          "operating_cost",
          "is_default",
        ],
        limitPageLength: 10,
      }),
    enabled: !!itemCode,
  });
}
