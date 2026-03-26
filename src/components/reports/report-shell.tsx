"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import type { DateRange } from "@/types/reports";

interface ReportShellProps {
  title: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export function ReportShell({
  title,
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing,
  toolbar,
  children,
}: ReportShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          {toolbar}
          <DateRangePicker dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
          <Button variant="outline" size="icon-sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
