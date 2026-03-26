import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseBalanceSheet } from "@/lib/report-parsers";
import type { DateRange, ReportRunResponse } from "@/types/reports";
import { format } from "date-fns";

export function useBalanceSheet(company: string, dateRange: DateRange) {
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: queryKeys.reports.balanceSheet(company, from, to),
    queryFn: () =>
      frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: "Balance Sheet",
        filters: {
          company,
          filter_based_on: "Date Range",
          period_start_date: from,
          period_end_date: to,
          periodicity: "Yearly",
          selected_view: "Report",
          accumulated_values: 1,
          include_default_book_entries: 1,
        },
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseBalanceSheet(data.result, data.columns),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}
