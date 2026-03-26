"use client";

import { useState } from "react";
import { startOfYear } from "date-fns";
import { useCompanyStore } from "@/stores/company-store";
import { useTrialBalance } from "@/hooks/use-trial-balance";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { DateRange } from "@/types/reports";

export default function TrialBalancePage() {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: new Date(),
  });

  const { data, isLoading, isRefetching, refetch } = useTrialBalance(company, dateRange);

  const netMovement = (data?.totalDebit ?? 0) - (data?.totalCredit ?? 0);

  const kpiItems = [
    { label: "Total Debit", value: data?.totalDebit ?? 0, format: "currency" as const },
    { label: "Total Credit", value: data?.totalCredit ?? 0, format: "currency" as const },
    { label: "Net Movement", value: Math.abs(netMovement), format: "currency" as const },
  ];

  const fmt = (v: number) => formatCurrency(Math.abs(v), currencySymbol, symbolOnRight);

  return (
    <ReportShell
      title="Trial Balance"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <ReportKpiCards items={kpiItems} isLoading={isLoading} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Account</TableHead>
              <TableHead className="text-right">Opening DR</TableHead>
              <TableHead className="text-right">Opening CR</TableHead>
              <TableHead className="text-right">Period DR</TableHead>
              <TableHead className="text-right">Period CR</TableHead>
              <TableHead className="text-right">Closing DR</TableHead>
              <TableHead className="text-right">Closing CR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows.map((row, i) => {
              const isGroup = row.indent === 0;
              return (
                <TableRow key={`${row.account}-${i}`}>
                  <TableCell
                    style={{ paddingLeft: `${row.indent * 1.5 + 0.5}rem` }}
                    className={isGroup ? "font-semibold" : ""}
                  >
                    {row.account_name}
                  </TableCell>
                  <TableCell className={`text-right ${isGroup ? "font-semibold" : ""}`}>
                    {row.opening_debit ? fmt(row.opening_debit) : ""}
                  </TableCell>
                  <TableCell className={`text-right ${isGroup ? "font-semibold" : ""}`}>
                    {row.opening_credit ? fmt(row.opening_credit) : ""}
                  </TableCell>
                  <TableCell className={`text-right ${isGroup ? "font-semibold" : ""}`}>
                    {row.debit ? fmt(row.debit) : ""}
                  </TableCell>
                  <TableCell className={`text-right ${isGroup ? "font-semibold" : ""}`}>
                    {row.credit ? fmt(row.credit) : ""}
                  </TableCell>
                  <TableCell className={`text-right ${isGroup ? "font-semibold" : ""}`}>
                    {row.closing_debit ? fmt(row.closing_debit) : ""}
                  </TableCell>
                  <TableCell className={`text-right ${isGroup ? "font-semibold" : ""}`}>
                    {row.closing_credit ? fmt(row.closing_credit) : ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {data && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {fmt(data.totalOpeningDebit)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {fmt(data.totalOpeningCredit)}
                </TableCell>
                <TableCell className="text-right font-bold">{fmt(data.totalDebit)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.totalCredit)}</TableCell>
                <TableCell className="text-right font-bold">
                  {fmt(data.totalClosingDebit)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {fmt(data.totalClosingCredit)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </ReportShell>
  );
}
