import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { format, subDays, startOfYear } from "date-fns";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { parseProfitLoss, parseSalesAnalytics, parseBalanceSheet } from "@/lib/report-parsers";
import type { ReportRunResponse } from "@/types/reports";
import type { DashboardData, SalesTrendPoint, RecentInvoice } from "@/types/dashboard";

interface RawInvoice {
  name: string;
  customer: string;
  posting_date: string;
  grand_total: number;
  currency?: string;
  status: RecentInvoice["status"];
}

const STALE_TIME = 5 * 60 * 1000;

function pct(cur: number, prev: number): number {
  if (prev === 0) return 0;
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
}

export function useDashboard(company: string) {
  const dates = useMemo(() => {
    const today = new Date();
    const fmt = (d: Date) => format(d, "yyyy-MM-dd");
    return {
      today: fmt(today),
      from30: fmt(subDays(today, 30)),
      from60: fmt(subDays(today, 60)),
      from31: fmt(subDays(today, 31)),
      yearStart: fmt(startOfYear(today)),
    };
  }, []);

  const results = useQueries({
    queries: [
      // 0: P&L current period
      {
        queryKey: queryKeys.reports.profitLoss(company, dates.from30, dates.today, "Monthly"),
        queryFn: () =>
          frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
            report_name: "Profit and Loss Statement",
            filters: {
              company,
              filter_based_on: "Date Range",
              period_start_date: dates.from30,
              period_end_date: dates.today,
              periodicity: "Monthly",
              selected_view: "Report",
              accumulated_values: 0,
              include_default_book_entries: 1,
            },
          }),
        enabled: !!company,
        staleTime: STALE_TIME,
        select: (data: ReportRunResponse) => parseProfitLoss(data.result, data.columns),
      },
      // 1: P&L previous period (optional — used for trend %)
      {
        queryKey: queryKeys.reports.profitLoss(company, dates.from60, dates.from31, "Monthly"),
        queryFn: () =>
          frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
            report_name: "Profit and Loss Statement",
            filters: {
              company,
              filter_based_on: "Date Range",
              period_start_date: dates.from60,
              period_end_date: dates.from31,
              periodicity: "Monthly",
              selected_view: "Report",
              accumulated_values: 0,
              include_default_book_entries: 1,
            },
          }),
        enabled: !!company,
        staleTime: STALE_TIME,
        select: (data: ReportRunResponse) => parseProfitLoss(data.result, data.columns),
      },
      // 2: Raw sales invoices for trend chart (aggregate client-side by date)
      {
        queryKey: queryKeys.dashboard.salesTrend(company, dates.from30, dates.today),
        queryFn: () =>
          frappe.getList<RawInvoice>("Sales Invoice", {
            filters: [
              ["company", "=", company],
              ["posting_date", ">=", dates.from30],
              ["docstatus", "=", 1],
            ],
            fields: ["posting_date", "grand_total"],
            limitPageLength: 1000,
          }),
        enabled: !!company,
        staleTime: STALE_TIME,
      },
      // 3: Sales Analytics by Item Group for profit breakdown
      {
        queryKey: queryKeys.dashboard.profitBreakdown(company, dates.from30, dates.today),
        queryFn: () =>
          frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
            report_name: "Sales Analytics",
            filters: {
              tree_type: "Item Group",
              doc_type: "Sales Invoice",
              value_quantity: "Value",
              from_date: dates.from30,
              to_date: dates.today,
              company,
              range: "Monthly",
            },
          }),
        enabled: !!company,
        staleTime: STALE_TIME,
        select: (data: ReportRunResponse) => parseSalesAnalytics(data.result, data.columns),
      },
      // 4: Recent Sales Invoices (last 5)
      {
        queryKey: queryKeys.dashboard.recentInvoices(company),
        queryFn: () =>
          frappe.getList<RawInvoice>("Sales Invoice", {
            filters: [
              ["company", "=", company],
              ["docstatus", "=", 1],
            ],
            fields: ["name", "customer", "posting_date", "grand_total", "currency", "status"],
            orderBy: "posting_date desc",
            limitPageLength: 5,
          }),
        enabled: !!company,
        staleTime: STALE_TIME,
      },
      // 5: Balance Sheet (year-to-date)
      {
        queryKey: queryKeys.reports.balanceSheet(company, dates.yearStart, dates.today),
        queryFn: () =>
          frappe.call<ReportRunResponse>("frappe.desk.query_report.run", {
            report_name: "Balance Sheet",
            filters: {
              company,
              filter_based_on: "Date Range",
              period_start_date: dates.yearStart,
              period_end_date: dates.today,
              periodicity: "Yearly",
              selected_view: "Report",
              accumulated_values: 1,
              include_default_book_entries: 1,
            },
          }),
        enabled: !!company,
        staleTime: STALE_TIME,
        select: (data: ReportRunResponse) => parseBalanceSheet(data.result, data.columns),
      },
    ],
  });

  const [plCurrentQ, plPrevQ, salesRawQ, breakdownQ, invoicesQ, balanceQ] = results;

  const isLoading = results.some((q) => q.isLoading);

  const data = useMemo((): DashboardData | undefined => {
    const plCurrent = plCurrentQ.data;
    const salesRaw = salesRawQ.data;
    const breakdown = breakdownQ.data;
    const invoicesRaw = invoicesQ.data;
    const balance = balanceQ.data;

    if (!plCurrent || !salesRaw || !breakdown || !invoicesRaw || !balance) return undefined;

    // Aggregate invoices by date for the trend chart
    const byDate = new Map<string, number>();
    for (const inv of salesRaw) {
      byDate.set(inv.posting_date, (byDate.get(inv.posting_date) ?? 0) + inv.grand_total);
    }
    const salesTrend: SalesTrendPoint[] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    // Top 5 item groups by revenue
    const profitBreakdown = breakdown.rows
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((r) => ({ category: r.entity_name, amount: r.total }));

    // Map raw invoices to typed RecentInvoice[]
    const recentInvoices: RecentInvoice[] = invoicesRaw.map((inv) => ({
      name: inv.name,
      customer: inv.customer,
      postingDate: inv.posting_date,
      grandTotal: inv.grand_total,
      currency: inv.currency,
      status: inv.status,
    }));

    // KPI assembly — previous period optional for trend
    const plPrev = plPrevQ.data;
    const grossProfitCur = plCurrent.incomeTotal - plCurrent.expenseTotal;
    const grossProfitPrev = plPrev ? plPrev.incomeTotal - plPrev.expenseTotal : grossProfitCur;

    return {
      kpi: {
        totalSales: plCurrent.incomeTotal,
        grossProfit: grossProfitCur,
        expenses: plCurrent.expenseTotal,
        netIncome: plCurrent.netProfitLoss,
        totalSalesTrend: pct(plCurrent.incomeTotal, plPrev?.incomeTotal ?? plCurrent.incomeTotal),
        grossProfitTrend: pct(grossProfitCur, grossProfitPrev),
        expensesTrend: pct(plCurrent.expenseTotal, plPrev?.expenseTotal ?? plCurrent.expenseTotal),
        netIncomeTrend: pct(
          plCurrent.netProfitLoss,
          plPrev?.netProfitLoss ?? plCurrent.netProfitLoss,
        ),
      },
      salesTrend,
      profitBreakdown,
      recentInvoices,
      balanceSheet: {
        totalAssets: balance.totalAssets,
        totalLiabilities: balance.totalLiabilities,
        totalEquity: balance.totalEquity,
      },
    };
  }, [
    plCurrentQ.data,
    plPrevQ.data,
    salesRawQ.data,
    breakdownQ.data,
    invoicesQ.data,
    balanceQ.data,
  ]);

  return { data, isLoading };
}
