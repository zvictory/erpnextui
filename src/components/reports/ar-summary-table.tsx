"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { useCurrencyMap } from "@/hooks/use-accounts";
import type { AgingRow } from "@/types/reports";

const BUCKET_KEYS = ["current", "1-30", "31-60", "61-90", "90+"] as const;

const BUCKET_LABEL_KEYS: Record<string, string> = {
  current: "notDue",
  "1-30": "days0_30",
  "31-60": "days31_60",
  "61-90": "days61_90",
  "90+": "days90plus",
};

interface ARSummaryTableProps {
  rows: AgingRow[];
}

export function ARSummaryTable({ rows }: ARSummaryTableProps) {
  const t = useTranslations("ar");
  const { data: currencyMap } = useCurrencyMap();
  const [sorting, setSorting] = useState<SortingState>([{ id: "total_outstanding", desc: true }]);

  const footerTotals = useMemo(() => {
    const totals = new Map<
      string,
      {
        current: number;
        "1-30": number;
        "31-60": number;
        "61-90": number;
        "90+": number;
        total: number;
      }
    >();
    for (const row of rows) {
      const currency = row.currency ?? "—";
      let t = totals.get(currency);
      if (!t) {
        t = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0 };
        totals.set(currency, t);
      }
      for (const key of BUCKET_KEYS) {
        t[key] += row[key] as number;
      }
      t.total += row.total_outstanding;
    }
    return totals;
  }, [rows]);

  function fmtCell(value: number, currency: string) {
    if (value === 0) return "";
    const info = currencyMap?.get(currency);
    const symbol = info?.symbol ?? "";
    const onRight = info?.onRight ?? false;
    const num = formatNumber(value, 2);
    if (!symbol) return num;
    return onRight ? `${num} ${symbol}` : `${symbol} ${num}`;
  }

  const columns = useMemo<ColumnDef<AgingRow, unknown>[]>(
    () => [
      {
        accessorKey: "party_name",
        header: t("customer"),
        cell: ({ row }) => (
          <Link
            href={`/customers/${row.original.party}`}
            className="text-primary hover:underline font-medium"
          >
            {row.original.party_name}
          </Link>
        ),
      },
      {
        accessorKey: "currency",
        header: t("currency"),
        size: 60,
        cell: ({ row }) => row.original.currency ?? "—",
      },
      ...BUCKET_KEYS.map(
        (bucket): ColumnDef<AgingRow, unknown> => ({
          accessorKey: bucket,
          header: () => <span className="block text-right">{t(BUCKET_LABEL_KEYS[bucket])}</span>,
          cell: ({ row }) => {
            const val = row.original[bucket] as number;
            return (
              <span
                className={cn(
                  "block text-right tabular-nums text-sm",
                  val > 0 && bucket === "90+" && "text-red-600 dark:text-red-400",
                  val > 0 && bucket === "61-90" && "text-orange-600 dark:text-orange-400",
                )}
              >
                {val > 0 ? formatNumber(val, 2) : ""}
              </span>
            );
          },
        }),
      ),
      {
        accessorKey: "total_outstanding",
        header: () => <span className="block text-right">{t("outstanding")}</span>,
        cell: ({ row }) => (
          <span className="block text-right font-semibold tabular-nums">
            {fmtCell(row.original.total_outstanding, row.original.currency ?? "")}
          </span>
        ),
      },
    ],
    [t, currencyMap],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border py-16">
        <p className="text-muted-foreground">{t("noData")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(header.column.getCanSort() && "cursor-pointer select-none")}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc"
                    ? " ↑"
                    : header.column.getIsSorted() === "desc"
                      ? " ↓"
                      : ""}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {footerTotals.size > 0 && (
          <TableFooter>
            {[...footerTotals.entries()].map(([currency, totals]) => {
              const info = currencyMap?.get(currency);
              const symbol = info?.symbol ?? "";
              const onRight = info?.onRight ?? false;
              return (
                <TableRow key={currency} className="font-semibold">
                  <TableCell>
                    {t("total")} ({currency})
                  </TableCell>
                  <TableCell>{currency}</TableCell>
                  {BUCKET_KEYS.map((bucket) => (
                    <TableCell key={bucket} className="text-right tabular-nums">
                      {totals[bucket] > 0 ? formatNumber(totals[bucket], 2) : ""}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold tabular-nums">
                    {symbol && !onRight ? `${symbol} ` : ""}
                    {formatNumber(totals.total, 2)}
                    {symbol && onRight ? ` ${symbol}` : ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
