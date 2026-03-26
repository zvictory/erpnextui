import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseSalesAnalytics } from "@/lib/report-parsers";
import type { DateRange, ReportRunResponse } from "@/types/reports";
import { format } from "date-fns";

export function useSalesReport(company: string, dateRange: DateRange, groupBy: string) {
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const reportQuery = useQuery({
    queryKey: queryKeys.reports.sales(company, from, to, groupBy),
    queryFn: () =>
      frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: "Sales Analytics",
        filters: {
          tree_type: groupBy,
          doc_type: "Sales Invoice",
          value_quantity: "Value",
          from_date: from,
          to_date: to,
          company,
          range: "Monthly",
        },
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseSalesAnalytics(data.result, data.columns),
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
    isLoading: reportQuery.isLoading,
    isRefetching: reportQuery.isRefetching || countQuery.isRefetching,
    refetch: () => {
      reportQuery.refetch();
      countQuery.refetch();
    },
  };
}
