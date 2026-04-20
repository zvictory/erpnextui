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

  const partyDoctype = reportType === "Accounts Receivable" ? "Customer" : "Supplier";
  const nameField = reportType === "Accounts Receivable" ? "customer_name" : "supplier_name";

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const report = await frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
        report_name: `${reportType} Summary`,
        filters: {
          company,
          report_date: asOfDate,
          ageing_based_on: "Posting Date",
          range1: 30,
          range2: 60,
          range3: 90,
          range4: 120,
          in_party_currency: 1,
        },
      });

      // Resolve party names — the Summary report only returns party codes.
      // Use frappe.call (POST) instead of frappe.getList (GET) because
      // hundreds of party codes in a GET query string exceeds URL length limits.
      const partyCodes = [
        ...new Set(
          report.result
            .filter((r): r is Record<string, unknown> => !Array.isArray(r) && !!r?.party)
            .map((r) => String(r.party)),
        ),
      ];

      const nameMap = new Map<string, string>();
      if (partyCodes.length > 0) {
        const parties = await frappe.call<{ name: string; [key: string]: unknown }[]>(
          "frappe.client.get_list",
          {
            doctype: partyDoctype,
            filters: JSON.stringify([["name", "in", partyCodes]]),
            fields: JSON.stringify(["name", nameField]),
            limit_page_length: 0,
          },
        );
        for (const p of parties) {
          nameMap.set(p.name, String(p[nameField] ?? p.name));
        }
      }

      // Clone result rows and inject party_name (React Query may freeze cached objects)
      const enrichedResult = report.result.map((row) => {
        if (!Array.isArray(row) && row?.party) {
          return {
            ...row,
            party_name: nameMap.get(String(row.party)) ?? String(row.party),
          };
        }
        return row;
      });

      return { ...report, result: enrichedResult };
    },
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
