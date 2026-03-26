import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseGeneralLedger } from "@/lib/report-parsers";
import type { DateRange, ReportRunResponse } from "@/types/reports";
import { format } from "date-fns";

export function useGeneralLedgerReport(
  company: string,
  dateRange: DateRange,
  account?: string,
  party?: string,
) {
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: queryKeys.reports.generalLedger(company, from, to, account, party),
    queryFn: () =>
      frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: "General Ledger",
        filters: {
          company,
          from_date: from,
          to_date: to,
          group_by: "Group by Voucher (Consolidated)",
          ...(account ? { account } : {}),
          ...(party ? { party } : {}),
        },
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
    select: (data) => parseGeneralLedger(data.result),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}
