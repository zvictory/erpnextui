import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseSalesByItem, parseSalesByCustomer } from "@/lib/report-parsers";
import type {
  SalesAnalyticsData,
  SalesAnalyticsDimension,
  SalesAnalyticsRow,
} from "@/types/reports";

export type SalesBasis = "base" | "invoice";

export interface SalesRegisterFilters {
  company: string;
  from: string;
  to: string;
  basis?: SalesBasis;
  customer?: string;
  customers?: string[];
  item?: string;
  items?: string[];
  itemGroup?: string;
  customerGroup?: string;
  warehouse?: string;
  salesPerson?: string;
  territory?: string;
  project?: string;
  costCenter?: string;
  brand?: string;
  currency?: string;
}

function resolveCustomers(f: SalesRegisterFilters): string[] {
  if (f.customers && f.customers.length > 0) return f.customers;
  if (f.customer) return [f.customer];
  return [];
}

function resolveItems(f: SalesRegisterFilters): string[] {
  if (f.items && f.items.length > 0) return f.items;
  if (f.item) return [f.item];
  return [];
}

function filterKey(f: SalesRegisterFilters): Record<string, string> {
  const customers = resolveCustomers(f);
  const items = resolveItems(f);
  return {
    basis: f.basis ?? "base",
    customers: customers.length > 0 ? JSON.stringify([...customers].sort()) : "",
    items: items.length > 0 ? JSON.stringify([...items].sort()) : "",
    itemGroup: f.itemGroup ?? "",
    customerGroup: f.customerGroup ?? "",
    warehouse: f.warehouse ?? "",
    salesPerson: f.salesPerson ?? "",
    territory: f.territory ?? "",
    project: f.project ?? "",
    costCenter: f.costCenter ?? "",
    brand: f.brand ?? "",
    currency: f.currency ?? "",
  };
}

// Rows synthesized to match the legacy Item-wise Sales Register row shape
// consumed by parseSalesByItem / parseSalesByCustomer. Each row represents
// ONE Sales Invoice Item joined to its parent Sales Invoice's header fields.
interface JoinedRow {
  invoice: string;
  voucher_no: string;
  posting_date: string;
  currency: string;
  customer: string;
  customer_name: string;
  customer_group?: string;
  territory?: string;
  project?: string;
  item_code: string;
  item_name: string;
  item_group?: string;
  qty: number;
  stock_qty: number;
  stock_uom?: string;
  warehouse?: string;
  cost_center?: string;
  brand?: string;
  amount: number;
  net_amount: number;
  base_amount: number;
  base_net_amount: number;
  [key: string]: string | number | undefined;
}

interface InvoiceHeader {
  name: string;
  currency: string;
  customer: string;
  customer_name: string;
  territory?: string;
  project?: string;
  posting_date: string;
  conversion_rate?: number;
}

interface InvoiceItem {
  parent: string;
  item_code: string;
  item_name: string;
  item_group?: string;
  qty: number;
  stock_qty: number;
  stock_uom?: string;
  warehouse?: string;
  cost_center?: string;
  brand?: string;
  amount: number;
  net_amount?: number;
  base_amount?: number;
  base_net_amount?: number;
}

interface Customer {
  name: string;
  customer_group?: string;
}

const ALL_RESULTS = 100000;
// Chunk size for ["name", "in", [...]] filters — each name adds ~30-40 chars to
// the URL (encoded). 50 keeps the URL well under the proxy's ~8k limit even
// when names are long (ACC-CUS-2026-xxxxx).
const IN_FILTER_CHUNK = 50;

async function fetchCustomerGroups(names: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (names.length === 0) return out;
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += IN_FILTER_CHUNK) {
    chunks.push(names.slice(i, i + IN_FILTER_CHUNK));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      frappe.getList<Customer>("Customer", {
        filters: [["name", "in", chunk]],
        fields: ["name", "customer_group"],
        limitPageLength: IN_FILTER_CHUNK,
      }),
    ),
  );
  for (const custs of results) {
    for (const c of custs) {
      if (c.customer_group) out.set(c.name, c.customer_group);
    }
  }
  return out;
}

async function fetchItemsByParents(
  invoiceNames: string[],
  extraFilters: unknown[],
): Promise<InvoiceItem[]> {
  if (invoiceNames.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < invoiceNames.length; i += IN_FILTER_CHUNK) {
    chunks.push(invoiceNames.slice(i, i + IN_FILTER_CHUNK));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      frappe.getList<InvoiceItem>("Sales Invoice Item", {
        filters: [["parent", "in", chunk], ...extraFilters],
        fields: [
          "parent",
          "item_code",
          "item_name",
          "item_group",
          "qty",
          "stock_qty",
          "stock_uom",
          "warehouse",
          "cost_center",
          "brand",
          "amount",
          "net_amount",
          "base_amount",
          "base_net_amount",
        ],
        limitPageLength: ALL_RESULTS,
        parentDoctype: "Sales Invoice",
      }),
    ),
  );
  return results.flat();
}

/**
 * Fetch and join Sales Invoice + Sales Invoice Item for the given filter set.
 * Produces rows with the exact field shape the existing parser expects, so
 * parsers/pages don't need to change. Replaces the `Item-wise Sales Register`
 * query-report source because that report strips invoice currency (returns
 * company currency + base-converted amounts on every row).
 */
async function fetchSalesRegisterRows(f: SalesRegisterFilters): Promise<JoinedRow[]> {
  // 1. Resolve customer-group / sales-person filters to a customer-name list
  //    (Sales Invoice doesn't denormalize customer_group; Sales Team is a
  //    child table we don't need to read here.)
  let customerAllowlist: string[] | null = null;
  if (f.customerGroup) {
    const customers = await frappe.getList<Customer>("Customer", {
      filters: [["customer_group", "=", f.customerGroup]],
      fields: ["name"],
      limitPageLength: ALL_RESULTS,
    });
    customerAllowlist = customers.map((c) => c.name);
    if (customerAllowlist.length === 0) return [];
  }

  // 2. Invoice-level filters (server-side)
  const invoiceFilters: unknown[] = [
    ["company", "=", f.company],
    ["posting_date", ">=", f.from],
    ["posting_date", "<=", f.to],
    ["docstatus", "=", 1],
  ];
  const customerList = resolveCustomers(f);
  if (customerList.length === 1) {
    invoiceFilters.push(["customer", "=", customerList[0]]);
  } else if (customerList.length > 1) {
    invoiceFilters.push(["customer", "in", customerList]);
  }
  if (f.territory) invoiceFilters.push(["territory", "=", f.territory]);
  if (f.project) invoiceFilters.push(["project", "=", f.project]);
  if (f.currency) invoiceFilters.push(["currency", "=", f.currency]);
  if (customerAllowlist) invoiceFilters.push(["customer", "in", customerAllowlist]);

  const invoices = await frappe.getList<InvoiceHeader>("Sales Invoice", {
    filters: invoiceFilters,
    fields: [
      "name",
      "currency",
      "customer",
      "customer_name",
      "territory",
      "project",
      "posting_date",
      "conversion_rate",
    ],
    limitPageLength: ALL_RESULTS,
  });
  if (invoices.length === 0) return [];

  const invoiceByName = new Map<string, InvoiceHeader>();
  for (const inv of invoices) invoiceByName.set(inv.name, inv);

  // 3. Optional: pre-resolve customer_group for every unique customer so rows
  //    can carry it for display (only needed when NOT already filtered by
  //    customer_group, because if we filtered by it every row has the same).
  let customerGroupByName = new Map<string, string>();
  if (!f.customerGroup) {
    const uniqueCustomers = Array.from(new Set(invoices.map((i) => i.customer).filter(Boolean)));
    customerGroupByName = await fetchCustomerGroups(uniqueCustomers);
  }

  // 4. Item-level filters (server-side): parent IN (invoice names, chunked to
  //    keep URL length under the proxy limit), plus any item-scoped filters.
  const invoiceNames = invoices.map((i) => i.name);
  const extraItemFilters: unknown[] = [];
  const itemList = resolveItems(f);
  if (itemList.length === 1) {
    extraItemFilters.push(["item_code", "=", itemList[0]]);
  } else if (itemList.length > 1) {
    extraItemFilters.push(["item_code", "in", itemList]);
  }
  if (f.itemGroup) extraItemFilters.push(["item_group", "=", f.itemGroup]);
  if (f.warehouse) extraItemFilters.push(["warehouse", "=", f.warehouse]);
  if (f.costCenter) extraItemFilters.push(["cost_center", "=", f.costCenter]);
  if (f.brand) extraItemFilters.push(["brand", "=", f.brand]);

  const items = await fetchItemsByParents(invoiceNames, extraItemFilters);

  // 5. Join — each item row inherits its parent invoice's currency + header.
  const rows: JoinedRow[] = [];
  for (const it of items) {
    const inv = invoiceByName.get(it.parent);
    if (!inv) continue;
    rows.push({
      invoice: inv.name,
      voucher_no: inv.name,
      posting_date: inv.posting_date,
      currency: inv.currency,
      customer: inv.customer,
      customer_name: inv.customer_name,
      customer_group: f.customerGroup || customerGroupByName.get(inv.customer),
      territory: inv.territory,
      project: inv.project,
      item_code: it.item_code,
      item_name: it.item_name,
      item_group: it.item_group,
      qty: Number(it.qty ?? 0),
      stock_qty: Number(it.stock_qty ?? 0),
      stock_uom: it.stock_uom,
      warehouse: it.warehouse,
      cost_center: it.cost_center,
      brand: it.brand,
      amount: Number(it.amount ?? 0),
      net_amount: Number(it.net_amount ?? it.amount ?? 0),
      base_amount: Number(it.base_amount ?? 0),
      base_net_amount: Number(it.base_net_amount ?? it.base_amount ?? 0),
    });
  }
  return rows;
}

export function useSalesByItemReport(f: SalesRegisterFilters) {
  return useQuery({
    queryKey: queryKeys.reports.salesByItem(f.company, f.from, f.to, filterKey(f)),
    queryFn: () => fetchSalesRegisterRows(f),
    enabled: !!f.company && !!f.from && !!f.to,
    staleTime: 5 * 60 * 1000,
    select: (rows) => parseSalesByItem(rows),
  });
}

export function useSalesByCustomerReport(f: SalesRegisterFilters) {
  return useQuery({
    queryKey: queryKeys.reports.salesByCustomer(f.company, f.from, f.to, filterKey(f)),
    queryFn: () => fetchSalesRegisterRows(f),
    enabled: !!f.company && !!f.from && !!f.to,
    staleTime: 5 * 60 * 1000,
    select: (rows) => parseSalesByCustomer(rows),
  });
}

// Qty-only aggregation. `stock_qty` is always in stock_uom, so summing it is
// safe across rows that share an item. When grouping by Customer/Territory,
// different items with different UOMs collapse into one row — we flag
// `mixedUom` so the UI can warn rather than silently pretending the number
// is a clean total.
function aggregateSalesAnalytics(
  rows: JoinedRow[],
  dimension: SalesAnalyticsDimension,
): SalesAnalyticsData {
  const buckets = new Map<
    string,
    {
      label: string;
      secondaryLabel?: string;
      monthlyQty: Record<string, number>;
      totalQty: number;
      lineCount: number;
      uoms: Set<string>;
    }
  >();
  const monthSet = new Set<string>();
  const monthlyTotals: Record<string, number> = {};
  let totalQty = 0;
  let lineCount = 0;

  const keyFor = (r: JoinedRow): { key: string; label: string; secondary?: string } => {
    switch (dimension) {
      case "item":
        return { key: r.item_code, label: r.item_code, secondary: r.item_name };
      case "itemGroup":
        return {
          key: r.item_group || "—",
          label: r.item_group || "—",
        };
      case "customer":
        return { key: r.customer, label: r.customer_name || r.customer };
      case "territory":
        return { key: r.territory || "—", label: r.territory || "—" };
    }
  };

  for (const r of rows) {
    const q = Number(r.stock_qty ?? r.qty ?? 0);
    if (!q) continue;
    const month = (r.posting_date || "").slice(0, 7); // YYYY-MM
    if (!month) continue;
    monthSet.add(month);

    const { key, label, secondary } = keyFor(r);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        label,
        secondaryLabel: secondary,
        monthlyQty: {},
        totalQty: 0,
        lineCount: 0,
        uoms: new Set<string>(),
      };
      buckets.set(key, bucket);
    }
    bucket.monthlyQty[month] = (bucket.monthlyQty[month] ?? 0) + q;
    bucket.totalQty += q;
    bucket.lineCount += 1;
    if (r.stock_uom) bucket.uoms.add(r.stock_uom);

    monthlyTotals[month] = (monthlyTotals[month] ?? 0) + q;
    totalQty += q;
    lineCount += 1;
  }

  const months = Array.from(monthSet).sort();
  const sortedRows: SalesAnalyticsRow[] = Array.from(buckets.entries())
    .map(([key, b]) => ({
      key,
      label: b.label,
      secondaryLabel: b.secondaryLabel,
      stockUom: b.uoms.size === 1 ? Array.from(b.uoms)[0] : undefined,
      mixedUom: b.uoms.size > 1,
      monthlyQty: b.monthlyQty,
      totalQty: b.totalQty,
      lineCount: b.lineCount,
    }))
    .sort((a, b) => b.totalQty - a.totalQty);

  return {
    rows: sortedRows,
    months,
    totalQty,
    lineCount,
    uniqueCount: sortedRows.length,
    monthlyTotals,
    anyMixedUom: sortedRows.some((r) => r.mixedUom),
  };
}

export interface SalesAnalyticsFilters extends SalesRegisterFilters {
  dimension?: SalesAnalyticsDimension;
}

function analyticsFilterKey(f: SalesAnalyticsFilters): Record<string, string> {
  return {
    ...filterKey(f),
    dimension: f.dimension ?? "item",
  };
}

export function useSalesAnalyticsReport(f: SalesAnalyticsFilters) {
  const dimension = f.dimension ?? "item";
  return useQuery({
    queryKey: queryKeys.reports.salesAnalytics(f.company, f.from, f.to, analyticsFilterKey(f)),
    queryFn: () => fetchSalesRegisterRows(f),
    enabled: !!f.company && !!f.from && !!f.to,
    staleTime: 5 * 60 * 1000,
    select: (rows) => aggregateSalesAnalytics(rows, dimension),
  });
}
