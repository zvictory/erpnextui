"use client";

import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, CalendarIcon } from "lucide-react";
import { useCompanyStore } from "@/stores/company-store";
import { useAgingReport } from "@/hooks/use-aging-report";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import { AgingChart } from "@/components/reports/aging-chart";
import { AgingTable } from "@/components/reports/aging-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccountsReceivablePage() {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading, isRefetching, refetch } = useAgingReport(
    company,
    asOfDate,
    "Accounts Receivable",
  );

  const kpiItems = [
    {
      label: "Current",
      value: data?.buckets.find((b) => b.label === "Current")?.amount ?? 0,
      format: "currency" as const,
    },
    {
      label: "1-30 Days",
      value: data?.buckets.find((b) => b.label === "1-30")?.amount ?? 0,
      format: "currency" as const,
    },
    {
      label: "31-60 Days",
      value: data?.buckets.find((b) => b.label === "31-60")?.amount ?? 0,
      format: "currency" as const,
    },
    {
      label: "Total Outstanding",
      value: data?.totalOutstanding ?? 0,
      format: "currency" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts Receivable</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="h-8 w-[160px] pl-8 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`size-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      <ReportKpiCards items={kpiItems} isLoading={isLoading} />
      <AgingChart buckets={data?.buckets} isLoading={isLoading} />
      <AgingTable
        rows={data?.rows ?? []}
        currencySymbol={currencySymbol}
        symbolOnRight={symbolOnRight}
      />
    </div>
  );
}
