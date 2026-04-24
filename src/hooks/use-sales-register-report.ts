import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseSalesByItem, parseSalesByCustomer } from "@/lib/report-parsers";
import type { ReportRunResponse } from "@/types/reports";

export type SalesBasis = "base" | "invoice";

export interface SalesRegisterFilters {
  company: string;
  from: string;
  to: string;
  basis?: SalesBasis;
  customer?: string;
  item?: string;
  itemGroup?: string;
  customerGroup?: string;
  warehouse?: string;
  salesPerson?: string;
  territory?: string;
  project?: string;
  costCenter?: string;
  brand?: string;
}

function buildFilters(f: SalesRegisterFilters) {
  const filters: Record<string, unknown> = {
    company: f.company,
    from_date: f.from,
    to_date: f.to,
  };
  if (f.customer) filters.customer = f.customer;
  if (f.item) filters.item_code = f.item;
  if (f.itemGroup) filters.item_group = f.itemGroup;
  if (f.customerGroup) filters.customer_group = f.customerGroup;
  if (f.warehouse) filters.warehouse = f.warehouse;
  if (f.salesPerson) filters.sales_person = f.salesPerson;
  if (f.territory) filters.territory = f.territory;
  if (f.project) filters.project = f.project;
  if (f.costCenter) filters.cost_center = f.costCenter;
  if (f.brand) filters.brand = f.brand;
  return filters;
}

function filterKey(f: SalesRegisterFilters): Record<string, string> {
  return {
    basis: f.basis ?? "base",
    customer: f.customer ?? "",
    item: f.item ?? "",
    itemGroup: f.itemGroup ?? "",
    customerGroup: f.customerGroup ?? "",
    warehouse: f.warehouse ?? "",
    salesPerson: f.salesPerson ?? "",
    territory: f.territory ?? "",
    project: f.project ?? "",
    costCenter: f.costCenter ?? "",
    brand: f.brand ?? "",
  };
}

async function runItemWiseSalesRegister(f: SalesRegisterFilters) {
  return frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
    report_name: "Item-wise Sales Register",
    filters: buildFilters(f),
  });
}

export function useSalesByItemReport(f: SalesRegisterFilters) {
  const basis = f.basis ?? "base";
  return useQuery({
    queryKey: queryKeys.reports.salesByItem(f.company, f.from, f.to, filterKey(f)),
    queryFn: () => runItemWiseSalesRegister(f),
    enabled: !!f.company && !!f.from && !!f.to,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseSalesByItem(data.result, basis),
  });
}

export function useSalesByCustomerReport(f: SalesRegisterFilters) {
  const basis = f.basis ?? "base";
  return useQuery({
    queryKey: queryKeys.reports.salesByCustomer(f.company, f.from, f.to, filterKey(f)),
    queryFn: () => runItemWiseSalesRegister(f),
    enabled: !!f.company && !!f.from && !!f.to,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseSalesByCustomer(data.result, basis),
  });
}
