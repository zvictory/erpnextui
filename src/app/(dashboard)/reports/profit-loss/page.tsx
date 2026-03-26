"use client";

import { useState } from "react";
import { startOfYear } from "date-fns";
import { useCompanyStore } from "@/stores/company-store";
import { useProfitLoss } from "@/hooks/use-profit-loss";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import { PeriodBarChart } from "@/components/reports/period-bar-chart";
import { AccountTreeTable } from "@/components/reports/account-tree-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "@/types/reports";

export default function ProfitLossPage() {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [periodicity, setPeriodicity] = useState("Monthly");

  const { data, isLoading, isRefetching, refetch } = useProfitLoss(company, dateRange, periodicity);

  const kpiItems = [
    { label: "Income", value: data?.incomeTotal ?? 0, format: "currency" as const },
    { label: "Expenses", value: data?.expenseTotal ?? 0, format: "currency" as const },
    {
      label: "Net Profit/Loss",
      value: data?.netProfitLoss ?? 0,
      format: "currency" as const,
    },
  ];

  return (
    <ReportShell
      title="Profit & Loss"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRefresh={refetch}
      isRefreshing={isRefetching}
      toolbar={
        <Select value={periodicity} onValueChange={setPeriodicity}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <ReportKpiCards items={kpiItems} isLoading={isLoading} />
      <PeriodBarChart
        title="Income vs Expenses"
        data={data?.chartData}
        categories={["income", "expenses"]}
        index="period"
        isLoading={isLoading}
      />
      <AccountTreeTable
        title="Income"
        accounts={data?.incomeAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
      <AccountTreeTable
        title="Expenses"
        accounts={data?.expenseAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
    </ReportShell>
  );
}
