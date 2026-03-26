import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseAgingReport } from "@/lib/report-parsers";
import type { ReportRunResponse } from "@/types/reports";

export function useAgingReport(
  company: string,
  asOfDate: string,
  reportType: "Accounts Receivable" | "Accounts Payable",
) {
  const queryKey =
    reportType === "Accounts Receivable"
      ? queryKeys.reports.accountsReceivable(company, asOfDate)
      : queryKeys.reports.accountsPayable(company, asOfDate);

  const query = useQuery({
    queryKey,
    queryFn: () =>
      frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: `${reportType} Summary`,
        filters: {
          company,
          report_date: asOfDate,
          ageing_based_on: "Posting Date",
          range1: 30,
          range2: 60,
          range3: 90,
          range4: 120,
        },
      }),
    enabled: !!company && !!asOfDate,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseAgingReport(data.result),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}
