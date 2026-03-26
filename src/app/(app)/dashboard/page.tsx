"use client";

import { useTranslations } from "next-intl";
import { useDashboard } from "@/hooks/use-dashboard";
import { useCompanyStore } from "@/stores/company-store";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CashPositionCard } from "@/components/dashboard/cash-position-card";
import { AgingSummaryCard } from "@/components/dashboard/aging-summary-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { BalanceSummary } from "@/components/dashboard/balance-summary";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const company = useCompanyStore((s) => s.company);
  const { data, isLoading } = useDashboard(company);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <QuickActions />
      <KpiCards data={data?.kpi} isLoading={isLoading} />
      <div className="grid gap-4 sm:grid-cols-3">
        <CashPositionCard />
        <AgingSummaryCard type="receivable" />
        <AgingSummaryCard type="payable" />
      </div>
      <RecentInvoices data={data?.recentInvoices} isLoading={isLoading} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart data={data?.salesTrend} isLoading={isLoading} />
        <ProfitChart data={data?.profitBreakdown} isLoading={isLoading} />
      </div>
      <BalanceSummary data={data?.balanceSheet} isLoading={isLoading} />
    </div>
  );
}
