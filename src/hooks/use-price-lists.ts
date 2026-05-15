import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { PriceList, PriceListListItem, ItemPrice } from "@/types/price-list";
import type { PriceListFormValues, ItemPriceFormValues } from "@/lib/schemas/price-list-schema";

const PAGE_SIZE = 20;

// ─── Price List CRUD ───────────────────────────────────────

function buildPriceListFilters(search: string, typeFilter: string) {
  const filters: unknown[][] = [];
  if (typeFilter === "selling") filters.push(["selling", "=", 1]);
  if (typeFilter === "buying") filters.push(["buying", "=", 1]);
  if (search) filters.push(["price_list_name", "like", `%${search}%`]);
  return filters;
}

export function usePriceListList(page: number, search: string, sort: string, typeFilter: string) {
  return useQuery({
    queryKey: queryKeys.priceLists.list(page, search, sort, typeFilter),
    queryFn: () =>
      frappe.getList<PriceListListItem>("Price List", {
        filters: buildPriceListFilters(search, typeFilter),
        fields: ["name", "price_list_name", "currency", "selling", "buying", "enabled"],
        orderBy: sort || "price_list_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
  });
}

export function usePriceListCount(search: string, typeFilter: string) {
  return useQuery({
    queryKey: queryKeys.priceLists.count(search, typeFilter),
    queryFn: () => frappe.getCount("Price List", buildPriceListFilters(search, typeFilter)),
  });
}

export function usePriceList(name: string) {
  return useQuery({
    queryKey: queryKeys.priceLists.detail(name),
    queryFn: () => frappe.getDoc<PriceList>("Price List", name),
    enabled: !!name,
  });
}

export function useCreatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PriceListFormValues) =>
      frappe.createDoc<PriceList>("Price List", {
        doctype: "Price List",
        ...data,
        selling: data.selling ? 1 : 0,
        buying: data.buying ? 1 : 0,
        enabled: data.enabled ? 1 : 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["priceLists"] });
    },
  });
}

export function useUpdatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<PriceListFormValues> }) => {
      const doc = await frappe.getDoc<PriceList>("Price List", name);
      return frappe.save<PriceList>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
        ...(data.selling !== undefined ? { selling: data.selling ? 1 : 0 } : {}),
        ...(data.buying !== undefined ? { buying: data.buying ? 1 : 0 } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled ? 1 : 0 } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["priceLists"] });
    },
  });
}

export function useDeletePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Price List", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["priceLists"] });
    },
  });
}

// ─── Item Price CRUD ───────────────────────────────────────

export function useItemPricesByList(priceList: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.itemPrices.list(priceList, page, search, sort),
    queryFn: () =>
      frappe.getList<ItemPrice>("Item Price", {
        filters: [["price_list", "=", priceList]],
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
          "price_list",
          "price_list_rate",
          "currency",
          "uom",
          "selling",
          "buying",
          "valid_from",
          "valid_upto",
        ],
        orderBy: sort || "item_code asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
    enabled: !!priceList,
  });
}

export function useItemPriceCountByList(priceList: string, search: string) {
  return useQuery({
    queryKey: queryKeys.itemPrices.count(priceList, search),
    queryFn: () =>
      frappe.getCount("Item Price", [
        ["price_list", "=", priceList],
        ...(search ? [["item_code", "like", `%${search}%`]] : []),
      ]),
    enabled: !!priceList,
  });
}

export function useCreateItemPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: ItemPriceFormValues & { price_list: string; selling: 0 | 1; buying: 0 | 1 },
    ) =>
      frappe.createDoc<ItemPrice>("Item Price", {
        doctype: "Item Price",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemPrices"] });
    },
  });
}

export function useUpdateItemPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<ItemPriceFormValues> }) => {
      const doc = await frappe.getDoc<ItemPrice>("Item Price", name);
      return frappe.save<ItemPrice>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemPrices"] });
    },
  });
}

export function useDeleteItemPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Item Price", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemPrices"] });
    },
  });
}

// ─── Bulk Operations ───────────────────────────────────────

async function batchProcess<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 10,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export function useBulkUpdatePrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      priceList,
      percentage,
      direction,
    }: {
      priceList: string;
      percentage: number;
      direction: "increase" | "decrease";
    }) => {
      const allPrices = await frappe.getList<ItemPrice>("Item Price", {
        filters: [["price_list", "=", priceList]],
        fields: ["name", "price_list_rate"],
        limitPageLength: 0,
      });

      const multiplier = direction === "increase" ? 1 + percentage / 100 : 1 - percentage / 100;

      const results = await batchProcess(allPrices, (item) =>
        frappe.updateDoc("Item Price", item.name, {
          price_list_rate: Math.round(item.price_list_rate * multiplier * 100) / 100,
        }),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed, total: allPrices.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemPrices"] });
    },
  });
}

export interface CsvImportRow {
  item_code: string;
  price_list_rate: number;
  uom?: string;
  min_qty?: number;
}

export function useImportItemPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      priceList,
      currency,
      selling,
      buying,
      rows,
    }: {
      priceList: string;
      currency: string;
      selling: 0 | 1;
      buying: 0 | 1;
      rows: CsvImportRow[];
    }) => {
      // Fetch existing item prices for this price list to detect upserts
      const existing = await frappe.getList<{ name: string; item_code: string }>("Item Price", {
        filters: [["price_list", "=", priceList]],
        fields: ["name", "item_code"],
        limitPageLength: 0,
      });
      const existingMap = new Map(existing.map((e) => [e.item_code, e.name]));

      const results = await batchProcess(rows, (row) => {
        const existingName = existingMap.get(row.item_code);
        if (existingName) {
          return frappe.updateDoc("Item Price", existingName, {
            price_list_rate: row.price_list_rate,
            ...(row.uom ? { uom: row.uom } : {}),
            ...(row.min_qty !== undefined ? { min_qty: row.min_qty } : {}),
          });
        }
        return frappe.createDoc("Item Price", {
          doctype: "Item Price",
          item_code: row.item_code,
          price_list: priceList,
          price_list_rate: row.price_list_rate,
          currency,
          selling,
          buying,
          ...(row.uom ? { uom: row.uom } : {}),
          ...(row.min_qty !== undefined ? { min_qty: row.min_qty } : {}),
        });
      });

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed, total: rows.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemPrices"] });
    },
  });
}
