"use client";

import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";

/** Active Work Orders — shows which workstation is running what */
export interface ActiveWorkOrder {
  name: string;
  production_item: string;
  item_name: string;
  qty: number;
  produced_qty: number;
  workstation: string;
  status: string;
  expected_delivery_date: string;
}

export function useActiveWorkOrders(company: string) {
  return useQuery({
    queryKey: ["factory", "activeWorkOrders", company],
    queryFn: () =>
      frappe.getList<ActiveWorkOrder>("Work Order", {
        filters: [
          ["company", "=", company],
          ["status", "in", ["In Process", "Not Started"]],
          ["docstatus", "=", 1],
        ],
        fields: [
          "name",
          "production_item",
          "item_name",
          "qty",
          "produced_qty",
          "workstation",
          "status",
          "expected_delivery_date",
        ],
        orderBy: "creation desc",
        limitPageLength: 50,
      }),
    enabled: !!company,
    refetchInterval: 10_000, // every 10 seconds
  });
}

/** Recent Stock Entries — material flow in the factory */
export interface RecentStockEntry {
  name: string;
  purpose: string;
  posting_date: string;
  posting_time: string;
  from_warehouse: string;
  to_warehouse: string;
  work_order: string;
  total_outgoing_value: number;
  total_incoming_value: number;
}

export function useRecentStockEntries(company: string, hours = 4) {
  const since = new Date(Date.now() - hours * 3600_000).toISOString().split("T")[0];
  return useQuery({
    queryKey: ["factory", "recentStockEntries", company, hours],
    queryFn: () =>
      frappe.getList<RecentStockEntry>("Stock Entry", {
        filters: [
          ["company", "=", company],
          ["posting_date", ">=", since],
          ["purpose", "in", ["Manufacture", "Material Transfer", "Material Receipt"]],
          ["docstatus", "=", 1],
        ],
        fields: [
          "name",
          "purpose",
          "posting_date",
          "posting_time",
          "from_warehouse",
          "to_warehouse",
          "work_order",
          "total_outgoing_value",
          "total_incoming_value",
        ],
        orderBy: "posting_date desc, posting_time desc",
        limitPageLength: 100,
      }),
    enabled: !!company,
    refetchInterval: 15_000, // every 15 seconds
  });
}

/** Warehouse stock summary */
export interface WarehouseBinItem {
  item_code: string;
  actual_qty: number;
  warehouse: string;
}

export function useWarehouseStock(warehouse: string) {
  return useQuery({
    queryKey: ["factory", "warehouseStock", warehouse],
    queryFn: () =>
      frappe.getList<WarehouseBinItem>("Bin", {
        filters: [
          ["warehouse", "=", warehouse],
          ["actual_qty", ">", 0],
        ],
        fields: ["item_code", "actual_qty", "warehouse"],
        limitPageLength: 0,
      }),
    enabled: !!warehouse,
    refetchInterval: 30_000, // every 30 seconds
  });
}
