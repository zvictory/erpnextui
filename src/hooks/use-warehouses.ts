import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Warehouse, WarehouseListItem } from "@/types/warehouse";

const PAGE_SIZE = 20;

export function useWarehouseList(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.warehouses.list(company, page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["warehouse_name", "like", `%${search}%`]);
      }
      return frappe.getList<WarehouseListItem>("Warehouse", {
        filters,
        fields: ["name", "warehouse_name", "company", "is_group"],
        orderBy: sort || "warehouse_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useWarehouseCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.warehouses.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["warehouse_name", "like", `%${search}%`]);
      }
      return frappe.getCount("Warehouse", filters);
    },
    enabled: !!company,
  });
}

export function useWarehouse(name: string) {
  return useQuery({
    queryKey: queryKeys.warehouses.detail(name),
    queryFn: () => frappe.getDoc<Warehouse>("Warehouse", name),
    enabled: !!name,
  });
}
