"use client";

import { useState } from "react";
import { startOfYear } from "date-fns";
import { useCompanyStore } from "@/stores/company-store";
import { useCashFlow } from "@/hooks/use-cash-flow";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import { AccountTreeTable } from "@/components/reports/account-tree-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "@/types/reports";

export default function CashFlowPage() {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [periodicity, setPeriodicity] = useState("Yearly");

  const { data, isLoading, isRefetching, refetch } = useCashFlow(company, dateRange, periodicity);

  const kpiItems = [
    { label: "Operating", value: data?.totalOperating ?? 0, format: "currency" as const },
    { label: "Investing", value: data?.totalInvesting ?? 0, format: "currency" as const },
    { label: "Financing", value: data?.totalFinancing ?? 0, format: "currency" as const },
    { label: "Net Change", value: data?.netCashChange ?? 0, format: "currency" as const },
  ];

  return (
    <ReportShell
      title="Cash Flow Statement"
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
            <SelectItem value="Yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <ReportKpiCards items={kpiItems} isLoading={isLoading} />
      <AccountTreeTable
        title="Operating Activities"
        accounts={data?.operatingAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
      <AccountTreeTable
        title="Investing Activities"
        accounts={data?.investingAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
      <AccountTreeTable
        title="Financing Activities"
        accounts={data?.financingAccounts ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
    </ReportShell>
  );
}
