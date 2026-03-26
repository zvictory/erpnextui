import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseCashFlow } from "@/lib/report-parsers";
import type { DateRange, ReportRunResponse } from "@/types/reports";
import { format } from "date-fns";

export function useCashFlow(company: string, dateRange: DateRange, periodicity: string) {
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: queryKeys.reports.cashFlow(company, from, to, periodicity),
    queryFn: () =>
      frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: "Cash Flow",
        filters: {
          company,
          filter_based_on: "Date Range",
          period_start_date: from,
          period_end_date: to,
          periodicity,
          selected_view: "Report",
          accumulated_values: 1,
          include_default_book_entries: 1,
        },
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseCashFlow(data.result, data.columns),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}
