import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import {
  parseSalesByItem,
  parseSalesByCustomer,
} from "@/lib/report-parsers";
import type { ReportRunResponse } from "@/types/reports";

export interface SalesRegisterFilters {
  company: string;
  from: string;
  to: string;
  customer?: string;
  item?: string;
  itemGroup?: string;
  customerGroup?: string;
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
  return filters;
}

async function runItemWiseSalesRegister(f: SalesRegisterFilters) {
  return frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
    report_name: "Item-wise Sales Register",
    filters: buildFilters(f),
  });
}

export function useSalesByItemReport(f: SalesRegisterFilters) {
  return useQuery({
    queryKey: queryKeys.reports.salesByItem(
      f.company,
      f.from,
      f.to,
      f.customer ?? "",
      f.item ?? "",
      f.itemGroup ?? "",
      f.customerGroup ?? "",
    ),
    queryFn: () => runItemWiseSalesRegister(f),
    enabled: !!f.company && !!f.from && !!f.to,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseSalesByItem(data.result),
  });
}

export function useSalesByCustomerReport(f: SalesRegisterFilters) {
  return useQuery({
    queryKey: queryKeys.reports.salesByCustomer(
      f.company,
      f.from,
      f.to,
      f.customer ?? "",
      f.item ?? "",
      f.itemGroup ?? "",
      f.customerGroup ?? "",
    ),
    queryFn: () => runItemWiseSalesRegister(f),
    enabled: !!f.company && !!f.from && !!f.to,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseSalesByCustomer(data.result),
  });
}
