import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseTrialBalance } from "@/lib/report-parsers";
import type { DateRange, ReportRunResponse } from "@/types/reports";
import { format } from "date-fns";

export function useTrialBalance(company: string, dateRange: DateRange) {
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: queryKeys.reports.trialBalance(company, from, to),
    queryFn: () =>
      frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: "Trial Balance",
        filters: {
          company,
          filter_based_on: "Date Range",
          period_start_date: from,
          period_end_date: to,
          show_unclosed_fy_pl_balances: 1,
        },
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseTrialBalance(data.result),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}
