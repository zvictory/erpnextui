"use client";

import { useState } from "react";
import { startOfYear } from "date-fns";
import { useCompanyStore } from "@/stores/company-store";
import { useSalesReport } from "@/hooks/use-sales-report";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import { PeriodBarChart } from "@/components/reports/period-bar-chart";
import { SalesTable } from "@/components/reports/sales-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "@/types/reports";

export default function SalesReportPage() {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [groupBy, setGroupBy] = useState("Customer");

  const { data, invoiceCount, isLoading, isRefetching, refetch } = useSalesReport(
    company,
    dateRange,
    groupBy,
  );

  const avgInvoiceValue = data && invoiceCount > 0 ? data.totalSales / invoiceCount : 0;

  const kpiItems = [
    { label: "Total Sales", value: data?.totalSales ?? 0, format: "currency" as const },
    { label: "Invoices", value: invoiceCount, format: "number" as const },
    { label: "Avg Invoice Value", value: avgInvoiceValue, format: "currency" as const },
  ];

  return (
    <ReportShell
      title="Sales Report"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRefresh={refetch}
      isRefreshing={isRefetching}
      toolbar={
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Customer">By Customer</SelectItem>
            <SelectItem value="Item">By Item</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <ReportKpiCards items={kpiItems} isLoading={isLoading} />
      <PeriodBarChart
        title="Monthly Sales"
        data={data?.chartData}
        categories={["amount"]}
        index="period"
        isLoading={isLoading}
      />
      <SalesTable
        rows={data?.rows ?? []}
        periods={data?.periods ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
        isLoading={isLoading}
      />
    </ReportShell>
  );
}
