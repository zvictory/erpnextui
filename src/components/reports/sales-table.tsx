"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { SalesRow, PeriodKey } from "@/types/reports";

interface SalesTableProps {
  rows: SalesRow[];
  periods: PeriodKey[];
  currencySymbol: string;
  symbolOnRight: boolean;
  isLoading: boolean;
}

export function SalesTable({
  rows,
  periods,
  currencySymbol,
  symbolOnRight,
  isLoading,
}: SalesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No sales data available</p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Name</TableHead>
            {periods.map((p) => (
              <TableHead key={p.key} className="text-right">
                {p.label}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.entity}>
              <TableCell className="font-medium">{row.entity_name}</TableCell>
              {periods.map((p) => (
                <TableCell key={p.key} className="text-right">
                  {formatCurrency(Number(row[p.key] ?? 0), currencySymbol, symbolOnRight)}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold">
                {formatCurrency(row.total, currencySymbol, symbolOnRight)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
