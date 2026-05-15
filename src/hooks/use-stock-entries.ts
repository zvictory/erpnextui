import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { StockEntry, StockEntryDetail, StockEntryListItem } from "@/types/stock-entry";

export interface StockEntryFilters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  docstatus?: string;
  warehouse?: string;
  [key: string]: string | undefined;
}

interface CreateStockEntryData {
  stock_entry_type: StockEntry["stock_entry_type"];
  posting_date: string;
  company: string;
  from_warehouse?: string;
  to_warehouse?: string;
  items: StockEntryDetail[];
}

const PAGE_SIZE = 20;

function buildFilters(company: string, search: string, f?: StockEntryFilters) {
  const filters: unknown[] = [["company", "=", company]];
  if (search) filters.push(["name", "like", `%${search}%`]);
  if (f?.type) filters.push(["stock_entry_type", "=", f.type]);
  if (f?.dateFrom) filters.push(["posting_date", ">=", f.dateFrom]);
  if (f?.dateTo) filters.push(["posting_date", "<=", f.dateTo]);
  if (f?.docstatus !== undefined && f.docstatus !== "")
    filters.push(["docstatus", "=", Number(f.docstatus)]);
  return filters;
}

export function useStockEntryList(
  company: string,
  page: number,
  search: string,
  sort: string,
  activeFilters?: StockEntryFilters,
) {
  return useQuery({
    queryKey: queryKeys.stockEntries.list(company, page, search, sort, activeFilters),
    queryFn: () => {
      const filters = buildFilters(company, search, activeFilters);
      const orFilters = activeFilters?.warehouse
        ? [
            ["from_warehouse", "=", activeFilters.warehouse],
            ["to_warehouse", "=", activeFilters.warehouse],
          ]
        : undefined;
      return frappe.getList<StockEntryListItem>("Stock Entry", {
        filters,
        orFilters,
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

export function useStockEntryCount(
  company: string,
  search: string,
  activeFilters?: StockEntryFilters,
) {
  return useQuery({
    queryKey: queryKeys.stockEntries.count(company, search, activeFilters),
    queryFn: () => {
      const filters = buildFilters(company, search, activeFilters);
      const orFilters = activeFilters?.warehouse
        ? [
            ["from_warehouse", "=", activeFilters.warehouse],
            ["to_warehouse", "=", activeFilters.warehouse],
          ]
        : undefined;
      return frappe.getCount("Stock Entry", filters, orFilters);
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
