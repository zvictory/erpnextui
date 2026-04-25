import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";

interface UseTransfersReportArgs {
  company: string;
  from: string;
  to: string;
  items?: string[];
  itemGroup?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
}

export interface TransferRow {
  posting_date: string;
  parent: string;
  item_code: string;
  item_name: string;
  item_group?: string;
  qty: number;
  uom: string;
  s_warehouse: string;
  t_warehouse: string;
  basic_rate: number;
  basic_amount: number;
}

interface TransferReportData {
  rows: TransferRow[];
  totalAmount: number;
  totalQty: number;
  uniqueItemCount: number;
  uniqueLaneCount: number;
  totalCount: number;
}

interface StockEntryHeader {
  name: string;
  posting_date: string;
}

interface StockEntryDetail {
  parent: string;
  item_code: string;
  item_name: string;
  item_group?: string;
  qty: number;
  uom: string;
  s_warehouse: string;
  t_warehouse: string;
  basic_rate: number;
  basic_amount: number;
}

const ALL_RESULTS = 100000;
// Same chunking guard as use-sales-register-report — keeps `name in (...)`
// query string under nginx's ~8k header limit.
const IN_FILTER_CHUNK = 50;

async function fetchTransferReport(args: UseTransfersReportArgs): Promise<TransferReportData> {
  const { company, from, to, items, itemGroup, fromWarehouse, toWarehouse } = args;

  // 1. Material Transfer headers in date range
  const headerFilters: unknown[] = [
    ["company", "=", company],
    ["stock_entry_type", "=", "Material Transfer"],
    ["docstatus", "=", 1],
    ["posting_date", ">=", from],
    ["posting_date", "<=", to],
  ];

  const headers = await frappe.getList<StockEntryHeader>("Stock Entry", {
    filters: headerFilters,
    fields: ["name", "posting_date"],
    orderBy: "posting_date desc",
    limitPageLength: ALL_RESULTS,
  });

  if (headers.length === 0) {
    return {
      rows: [],
      totalAmount: 0,
      totalQty: 0,
      uniqueItemCount: 0,
      uniqueLaneCount: 0,
      totalCount: 0,
    };
  }

  const dateByParent = new Map(headers.map((h) => [h.name, h.posting_date]));
  const parentNames = headers.map((h) => h.name);

  // 2. Pull child rows in chunks
  const detailFilters: unknown[] = [
    ["s_warehouse", "is", "set"],
    ["t_warehouse", "is", "set"],
  ];
  if (items && items.length > 0) detailFilters.push(["item_code", "in", items]);
  if (itemGroup) detailFilters.push(["item_group", "=", itemGroup]);
  if (fromWarehouse) detailFilters.push(["s_warehouse", "=", fromWarehouse]);
  if (toWarehouse) detailFilters.push(["t_warehouse", "=", toWarehouse]);

  const chunks: string[][] = [];
  for (let i = 0; i < parentNames.length; i += IN_FILTER_CHUNK) {
    chunks.push(parentNames.slice(i, i + IN_FILTER_CHUNK));
  }

  const chunkResults = await Promise.all(
    chunks.map((chunk) =>
      frappe.getList<StockEntryDetail>("Stock Entry Detail", {
        filters: [["parent", "in", chunk], ...detailFilters],
        fields: [
          "parent",
          "item_code",
          "item_name",
          "item_group",
          "qty",
          "uom",
          "s_warehouse",
          "t_warehouse",
          "basic_rate",
          "basic_amount",
        ],
        limitPageLength: ALL_RESULTS,
      }),
    ),
  );

  const rows: TransferRow[] = chunkResults
    .flat()
    .map((r) => ({ ...r, posting_date: dateByParent.get(r.parent) ?? "" }))
    .sort((a, b) => (a.posting_date < b.posting_date ? 1 : -1));

  let totalAmount = 0;
  let totalQty = 0;
  const itemSet = new Set<string>();
  const laneSet = new Set<string>();
  for (const r of rows) {
    totalAmount += r.basic_amount ?? 0;
    totalQty += r.qty ?? 0;
    itemSet.add(r.item_code);
    laneSet.add(`${r.s_warehouse}>${r.t_warehouse}`);
  }

  return {
    rows,
    totalAmount,
    totalQty,
    uniqueItemCount: itemSet.size,
    uniqueLaneCount: laneSet.size,
    totalCount: rows.length,
  };
}

export function useWarehouseTransfersReport(args: UseTransfersReportArgs) {
  return useQuery({
    queryKey: [
      "warehouseTransfersReport",
      args.company,
      args.from,
      args.to,
      args.items?.slice().sort().join(",") ?? "",
      args.itemGroup ?? "",
      args.fromWarehouse ?? "",
      args.toWarehouse ?? "",
    ],
    queryFn: () => fetchTransferReport(args),
    enabled: !!args.company && !!args.from && !!args.to,
    staleTime: 60_000,
  });
}
