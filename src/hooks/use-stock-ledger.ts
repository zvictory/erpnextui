import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { StockLedgerEntry, BinEntry } from "@/types/stock-entry";

const PAGE_SIZE = 20;

export function useStockLedger(itemCode: string, warehouse: string, page: number) {
  return useQuery({
    queryKey: queryKeys.stockLedger.list(itemCode, warehouse, page),
    queryFn: () => {
      const filters: unknown[] = [];
      if (itemCode) filters.push(["item_code", "=", itemCode]);
      if (warehouse) filters.push(["warehouse", "=", warehouse]);
      return frappe.getList<StockLedgerEntry>("Stock Ledger Entry", {
        filters,
        fields: [
          "name",
          "item_code",
          "item_name",
          "warehouse",
          "posting_date",
          "actual_qty",
          "qty_after_transaction",
          "valuation_rate",
          "stock_value",
          "voucher_type",
          "voucher_no",
        ],
        orderBy: "posting_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!(itemCode || warehouse),
  });
}

export function useStockLedgerCount(itemCode: string, warehouse: string) {
  return useQuery({
    queryKey: queryKeys.stockLedger.count(itemCode, warehouse),
    queryFn: () => {
      const filters: unknown[] = [];
      if (itemCode) filters.push(["item_code", "=", itemCode]);
      if (warehouse) filters.push(["warehouse", "=", warehouse]);
      return frappe.getCount("Stock Ledger Entry", filters);
    },
    enabled: !!(itemCode || warehouse),
  });
}

async function enrichBinsWithItemNames(bins: BinEntry[]): Promise<BinEntry[]> {
  if (bins.length === 0) return bins;
  const codes = [...new Set(bins.map((b) => b.item_code))];
  const items = await frappe.getList<{ name: string; item_name: string }>("Item", {
    filters: [["name", "in", codes]],
    fields: ["name", "item_name"],
    limitPageLength: 0,
  });
  const nameMap = new Map(items.map((i) => [i.name, i.item_name]));
  return bins.map((b) => ({ ...b, item_name: nameMap.get(b.item_code) ?? b.item_code }));
}

export function useItemBins(itemCode: string) {
  return useQuery({
    queryKey: queryKeys.bins.byItem(itemCode),
    queryFn: async () => {
      const bins = await frappe.getList<BinEntry>("Bin", {
        filters: [["item_code", "=", itemCode]],
        fields: ["item_code", "warehouse", "actual_qty", "stock_value", "valuation_rate"],
        limitPageLength: 0,
      });
      return enrichBinsWithItemNames(bins);
    },
    enabled: !!itemCode,
  });
}

export function useWarehouseBins(warehouse: string) {
  return useQuery({
    queryKey: queryKeys.bins.byWarehouse(warehouse),
    queryFn: async () => {
      const bins = await frappe.getList<BinEntry>("Bin", {
        filters: [["warehouse", "=", warehouse]],
        fields: ["item_code", "warehouse", "actual_qty", "stock_value", "valuation_rate"],
        limitPageLength: 0,
      });
      return enrichBinsWithItemNames(bins);
    },
    enabled: !!warehouse,
  });
}
