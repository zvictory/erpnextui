"use client";

import { useState } from "react";
import { startOfYear } from "date-fns";
import { useCompanyStore } from "@/stores/company-store";
import { useBalanceSheet } from "@/hooks/use-balance-sheet-report";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import { CompositionChart } from "@/components/reports/composition-chart";
import { AccountTreeTable } from "@/components/reports/account-tree-table";
import type { DateRange } from "@/types/reports";

export default function BalanceSheetPage() {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: new Date(),
  });

  const { data, isLoading, isRefetching, refetch } = useBalanceSheet(company, dateRange);

  const kpiItems = [
    { label: "Total Assets", value: data?.totalAssets ?? 0, format: "currency" as const },
    { label: "Total Liabilities", value: data?.totalLiabilities ?? 0, format: "currency" as const },
    { label: "Total Equity", value: data?.totalEquity ?? 0, format: "currency" as const },
  ];

  return (
    <ReportShell
      title="Balance Sheet"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <ReportKpiCards items={kpiItems} isLoading={isLoading} />
      <CompositionChart data={data?.compositionData} isLoading={isLoading} />
      <AccountTreeTable
        title="Assets"
        accounts={data?.assetAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
      <AccountTreeTable
        title="Liabilities"
        accounts={data?.liabilityAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
      <AccountTreeTable
        title="Equity"
        accounts={data?.equityAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
    </ReportShell>
  );
}
