import { Suspense } from "react";
import { startOfMonth, format } from "date-fns";

import {
  getDashboardKPIs,
  getDailyEfficiencyTrend,
  getProductionByProduct,
  getLineComparison,
} from "@/actions/dashboard";
import { getDowntimeParetoData } from "@/actions/downtime";
import { getLines } from "@/actions/lines";

import { DashboardFilters } from "@/components/manufacturing/dashboard/dashboard-filters";
import { KPICards } from "@/components/manufacturing/dashboard/kpi-cards";
import { EfficiencyChart } from "@/components/manufacturing/dashboard/efficiency-chart";
import { ProductionChart } from "@/components/manufacturing/dashboard/production-chart";
import { ParetoChart } from "@/components/manufacturing/dashboard/pareto-chart";
import { LineComparison } from "@/components/manufacturing/dashboard/line-comparison";

interface DashboardPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    lineIds?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

  // Default to current month if no date range given
  const today = new Date();
  const dateFrom = params.dateFrom ?? format(startOfMonth(today), "yyyy-MM-dd");
  const dateTo = params.dateTo ?? format(today, "yyyy-MM-dd");
  const lineIds = params.lineIds
    ? params.lineIds.split(",").filter(Boolean).map(Number)
    : undefined;

  // Fetch all data in parallel
  const [kpisResult, trendResult, productionResult, lineCompResult, paretoResult, linesResult] =
    await Promise.all([
      getDashboardKPIs(dateFrom, dateTo, lineIds),
      getDailyEfficiencyTrend(dateFrom, dateTo, lineIds),
      getProductionByProduct(dateFrom, dateTo, lineIds),
      getLineComparison(dateFrom, dateTo),
      getDowntimeParetoData({ dateFrom, dateTo }),
      getLines(),
    ]);

  const kpis = kpisResult.success
    ? kpisResult.data
    : {
        productivity: 0,
        efficiency: 0,
        totalOutput: 0,
        totalUnplannedDowntimeHours: 0,
        previous: null,
      };

  const trendData = trendResult.success ? trendResult.data : [];
  const productionData = productionResult.success ? productionResult.data : [];
  const lineCompData = lineCompResult.success ? lineCompResult.data : [];

  const paretoData = paretoResult.success
    ? paretoResult.data.map((d) => ({
        stopCodeName: d.stopCodeName,
        totalMinutes: d.totalMinutes,
        cumulativePercentage: d.cumulativePercentage,
      }))
    : [];

  const lines = linesResult.success
    ? linesResult.data.map((l) => ({ id: l.id, name: l.name }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of factory performance, OEE metrics, and key indicators.
        </p>
      </div>

      {/* Filter Bar */}
      <Suspense fallback={null}>
        <DashboardFilters lines={lines} />
      </Suspense>

      {/* KPI Cards */}
      <KPICards kpis={kpis} />

      {/* Charts Row 1: Efficiency Trend + Production by Product */}
      <div className="grid gap-4 md:grid-cols-2">
        <EfficiencyChart data={trendData} />
        <ProductionChart data={productionData} />
      </div>

      {/* Charts Row 2: Pareto + Line Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <ParetoChart data={paretoData} />
        <LineComparison data={lineCompData} />
      </div>
    </div>
  );
}
