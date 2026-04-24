import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseSalesRegisterRollup } from "@/lib/report-parsers";
import type { DateRange, ReportRunResponse } from "@/types/reports";
import { format } from "date-fns";

export function useSalesReport(company: string, dateRange: DateRange, groupBy: string) {
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");
  const rollup: "Customer" | "Item" = groupBy === "Item" ? "Item" : "Customer";

  const reportQuery = useQuery({
    queryKey: queryKeys.reports.sales(company, from, to, groupBy),
    queryFn: () =>
      frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: "Sales Register",
        filters: {
          company,
          from_date: from,
          to_date: to,
          include_payments: 0,
        },
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseSalesRegisterRollup(data.result, rollup),
  });

  const countQuery = useQuery({
    queryKey: queryKeys.reports.salesInvoiceCount(company, from, to),
    queryFn: () =>
      frappe.getCount("Sales Invoice", [
        ["company", "=", company],
        ["posting_date", ">=", from],
        ["posting_date", "<=", to],
        ["docstatus", "=", 1],
      ]),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: reportQuery.data,
    invoiceCount: countQuery.data ?? 0,
    currencyCode: reportQuery.data?.currencyCode ?? "",
    isLoading: reportQuery.isLoading,
    isRefetching: reportQuery.isRefetching || countQuery.isRefetching,
    refetch: () => {
      reportQuery.refetch();
      countQuery.refetch();
    },
  };
}
