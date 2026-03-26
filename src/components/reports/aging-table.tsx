"use client";

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
import type { AgingRow } from "@/types/reports";

interface AgingTableProps {
  rows: AgingRow[];
  currencySymbol: string;
  symbolOnRight: boolean;
}

export function AgingTable({ rows, currencySymbol, symbolOnRight }: AgingTableProps) {
  const fmt = (v: number) => formatCurrency(Math.abs(v), currencySymbol, symbolOnRight);

  const totals = rows.reduce(
    (acc, r) => ({
      current: acc.current + r.current,
      "1-30": acc["1-30"] + r["1-30"],
      "31-60": acc["31-60"] + r["31-60"],
      "61-90": acc["61-90"] + r["61-90"],
      "90+": acc["90+"] + r["90+"],
      total: acc.total + r.total_outstanding,
    }),
    { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0 },
  );

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Party</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">1-30</TableHead>
            <TableHead className="text-right">31-60</TableHead>
            <TableHead className="text-right">61-90</TableHead>
            <TableHead className="text-right">90+</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.party}-${i}`}>
              <TableCell>{row.party_name}</TableCell>
              <TableCell className="text-right">{row.current ? fmt(row.current) : ""}</TableCell>
              <TableCell className="text-right">{row["1-30"] ? fmt(row["1-30"]) : ""}</TableCell>
              <TableCell className="text-right">{row["31-60"] ? fmt(row["31-60"]) : ""}</TableCell>
              <TableCell className="text-right">{row["61-90"] ? fmt(row["61-90"]) : ""}</TableCell>
              <TableCell className="text-right">{row["90+"] ? fmt(row["90+"]) : ""}</TableCell>
              <TableCell className="text-right font-semibold">
                {fmt(row.total_outstanding)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-bold">Total</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.current)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals["1-30"])}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals["31-60"])}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals["61-90"])}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals["90+"])}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
