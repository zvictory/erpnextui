import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { StockEntry, StockEntryDetail, StockEntryListItem } from "@/types/stock-entry";

interface CreateStockEntryData {
  stock_entry_type: StockEntry["stock_entry_type"];
  posting_date: string;
  company: string;
  from_warehouse?: string;
  to_warehouse?: string;
  items: StockEntryDetail[];
}

const PAGE_SIZE = 20;

export function useStockEntryList(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.stockEntries.list(company, page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["name", "like", `%${search}%`]);
      }
      return frappe.getList<StockEntryListItem>("Stock Entry", {
        filters,
        fields: [
          "name",
          "stock_entry_type",
          "posting_date",
          "company",
          "total_amount",
          "docstatus",
          "from_warehouse",
          "to_warehouse",
        ],
        orderBy: sort || "posting_date desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useStockEntryCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.stockEntries.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["name", "like", `%${search}%`]);
      }
      return frappe.getCount("Stock Entry", filters);
    },
    enabled: !!company,
  });
}

export function useStockEntry(name: string) {
  return useQuery({
    queryKey: queryKeys.stockEntries.detail(name),
    queryFn: () => frappe.getDoc<StockEntry>("Stock Entry", name),
    enabled: !!name,
  });
}

export function useCreateStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStockEntryData) => {
      const doc = await frappe.createDoc<StockEntry>("Stock Entry", {
        doctype: "Stock Entry",
        ...data,
        items: data.items.map((item) => ({
          ...item,
          doctype: "Stock Entry Detail",
        })),
      });
      // Submit immediately after creation
      const full = await frappe.getDoc<StockEntry>("Stock Entry", doc.name);
      return frappe.submit<StockEntry>(full as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stockEntries"] });
      qc.invalidateQueries({ queryKey: ["bins"] });
      qc.invalidateQueries({ queryKey: ["stockLedger"] });
      qc.invalidateQueries({ queryKey: ["serialNumbers"] });
    },
  });
}

export function useCancelStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Stock Entry", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stockEntries"] });
      qc.invalidateQueries({ queryKey: ["bins"] });
      qc.invalidateQueries({ queryKey: ["stockLedger"] });
      qc.invalidateQueries({ queryKey: ["serialNumbers"] });
    },
  });
}

export function useDeleteStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Stock Entry", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stockEntries"] });
    },
  });
}
