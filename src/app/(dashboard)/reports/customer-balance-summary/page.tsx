"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, CalendarIcon, Search, Users, ArrowUpDown } from "lucide-react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";

import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useAgingReport } from "@/hooks/use-aging-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";

interface BalanceRow {
  party: string;
  party_name: string;
  total_outstanding: number;
  currency: string;
}

export default function CustomerBalanceSummaryPage() {
  const t = useTranslations("cbs");
  const { company } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();

  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [currency, setCurrency] = useState("");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "total_outstanding", desc: true }]);

  const { data, isLoading, isRefetching, refetch } = useAgingReport(
    company,
    asOfDate,
    "Accounts Receivable",
  );

  // Collapse aging rows into simple balance rows
  const balanceRows = useMemo<BalanceRow[]>(() => {
    if (!data?.rows) return [];
    return data.rows
      .filter((r) => Math.abs(r.total_outstanding) >= 0.005)
      .map((r) => ({
        party: r.party,
        party_name: r.party_name,
        total_outstanding: r.total_outstanding,
        currency: r.currency ?? "",
      }));
  }, [data?.rows]);

  const filteredRows = useMemo(() => {
    let rows = balanceRows;
    if (currency) rows = rows.filter((r) => r.currency === currency);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.party_name.toLowerCase().includes(q) || r.party.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [balanceRows, currency, search]);

  // Currency breakdown for summary cards
  const currencyBreakdown = useMemo(() => {
    const breakdown = new Map<string, { total: number; count: number }>();
    for (const row of filteredRows) {
      const entry = breakdown.get(row.currency) ?? { total: 0, count: 0 };
      entry.total += row.total_outstanding;
      entry.count++;
      breakdown.set(row.currency, entry);
    }
    return breakdown;
  }, [filteredRows]);

  // Available currencies for filter dropdown
  const availableCurrencies = useMemo(() => {
    const set = new Set(balanceRows.map((r) => r.currency));
    return Array.from(set).sort();
  }, [balanceRows]);

  // TanStack table columns
  const columns = useMemo<ColumnDef<BalanceRow>[]>(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>
        ),
        size: 50,
        enableSorting: false,
      },
      {
        accessorKey: "party_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("customer")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Link href={`/customers`} className="font-medium hover:underline">
            {row.original.party_name}
          </Link>
        ),
      },
      {
        accessorKey: "currency",
        header: t("currency"),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.currency}</span>
        ),
        size: 80,
      },
      {
        accessorKey: "total_outstanding",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("balance")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const amount = row.original.total_outstanding;
          const cur = row.original.currency;
          const info = currencyMap?.get(cur);
          return (
            <span className="tabular-nums font-medium">
              {formatCurrency(amount, info?.symbol ?? cur, info?.onRight)}
            </span>
          );
        },
        meta: { className: "text-right" },
      },
    ],
    [t, currencyMap],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Excel export
  const exportExcel = useCallback(() => {
    if (filteredRows.length === 0) return;

    const wb = XLSX.utils.book_new();

    const byCurrency = new Map<string, BalanceRow[]>();
    for (const row of filteredRows) {
      const list = byCurrency.get(row.currency) ?? [];
      list.push(row);
      byCurrency.set(row.currency, list);
    }

    for (const [cur, rows] of byCurrency) {
      const info = currencyMap?.get(cur);
      const symbol = info?.symbol ?? cur;

      const headers = [t("customer"), t("balance")];
      const dataRows = rows.map((r) => [r.party_name, r.total_outstanding]);

      const grandTotal = rows.reduce((s, r) => s + r.total_outstanding, 0);
      dataRows.push([]);
      dataRows.push([t("total"), grandTotal]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      ws["!cols"] = [{ wch: 35 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, `${cur} (${symbol})`);
    }

    XLSX.writeFile(wb, `Customer-Balance-Summary-${asOfDate}.xlsx`);
  }, [filteredRows, currencyMap, asOfDate, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            disabled={filteredRows.length === 0}
          >
            <Download className="mr-1 size-4" />
            Excel
          </Button>
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

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("asOfDate")}
          </label>
          <div className="relative">
            <CalendarIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="h-8 w-[160px] pl-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("currency")}
          </label>
          <Select
            value={currency || "all"}
            onValueChange={(v) => setCurrency(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-[120px] text-sm">
              <SelectValue placeholder={t("allCurrencies")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCurrencies")}</SelectItem>
              {availableCurrencies.map((cur) => (
                <SelectItem key={cur} value={cur}>
                  {cur}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("customer")}
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchCustomer")}
              className="h-8 w-[200px] pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : currencyBreakdown.size > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from(currencyBreakdown.entries()).map(([cur, { total, count }]) => {
            const info = currencyMap?.get(cur);
            return (
              <Card key={cur}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {cur} {t("totalOutstanding")}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatCurrency(total, info?.symbol ?? cur, info?.onRight)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("customersCount", { count })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                <Users className="text-muted-foreground size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  {t("totalCustomers")}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {new Set(filteredRows.map((r) => r.party)).size}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Balance Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { className?: string } | undefined;
                  return (
                    <TableHead key={header.id} className={meta?.className}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                      return (
                        <TableCell key={cell.id} className={meta?.className}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

                {/* Footer totals per currency */}
                {Array.from(currencyBreakdown.entries()).map(([cur, { total }]) => {
                  const info = currencyMap?.get(cur);
                  return (
                    <TableRow key={`total-${cur}`} className="font-semibold">
                      <TableCell />
                      <TableCell>
                        {t("total")} ({cur})
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(total, info?.symbol ?? cur, info?.onRight)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
