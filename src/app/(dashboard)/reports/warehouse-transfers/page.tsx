"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, ArrowUpDown, ArrowRight } from "lucide-react";
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
import {
  useWarehouseTransfersReport,
  type TransferRow,
} from "@/hooks/use-warehouse-transfers-report";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkField } from "@/components/shared/link-field";
import { MultiLinkField } from "@/components/shared/multi-link-field";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import type { DateRange } from "@/types/reports";

export default function WarehouseTransfersPage() {
  const t = useTranslations("wht");
  const {
    company,
    currencyCode: baseCurrencyCode,
    currencySymbol: baseSymbol,
    symbolOnRight: baseOnRight,
  } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [items, setItems] = useState<string[]>([]);
  const [itemGroup, setItemGroup] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const { data, isLoading, isRefetching, refetch } = useWarehouseTransfersReport({
    company,
    from,
    to,
    items,
    itemGroup,
    fromWarehouse,
    toWarehouse,
  });

  const rows = data?.rows ?? [];
  const totalAmount = data?.totalAmount ?? 0;
  const totalQty = data?.totalQty ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const uniqueItemCount = data?.uniqueItemCount ?? 0;
  const uniqueLaneCount = data?.uniqueLaneCount ?? 0;

  const baseInfo = useMemo(() => {
    const info = baseCurrencyCode ? currencyMap?.get(baseCurrencyCode) : undefined;
    return {
      symbol: info?.symbol ?? baseSymbol,
      onRight: info?.onRight ?? baseOnRight,
    };
  }, [currencyMap, baseCurrencyCode, baseSymbol, baseOnRight]);

  const columns = useMemo<ColumnDef<TransferRow>[]>(
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
        accessorKey: "posting_date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("date")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-xs">{formatDate(row.original.posting_date)}</span>
        ),
      },
      {
        accessorKey: "parent",
        header: t("entry"),
        cell: ({ row }) => (
          <Link
            href={`/stock-entries/${encodeURIComponent(row.original.parent)}`}
            className="text-xs hover:underline"
          >
            {row.original.parent}
          </Link>
        ),
      },
      {
        accessorKey: "item_code",
        header: t("item"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              href={`/products/${encodeURIComponent(row.original.item_code)}`}
              className="font-medium hover:underline"
            >
              {row.original.item_code}
            </Link>
            <span className="text-muted-foreground text-xs">{row.original.item_name}</span>
          </div>
        ),
      },
      {
        id: "lane",
        header: t("lane"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs">
            <span>{row.original.s_warehouse}</span>
            <ArrowRight className="size-3 shrink-0" />
            <span>{row.original.t_warehouse}</span>
          </div>
        ),
      },
      {
        accessorKey: "qty",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("qty")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.qty)} {row.original.uom}
          </span>
        ),
        meta: { className: "text-right" },
      },
      {
        accessorKey: "basic_amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("amount")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatCurrency(row.original.basic_amount, baseInfo.symbol, baseInfo.onRight)}
          </span>
        ),
        meta: { className: "text-right" },
      },
    ],
    [t, baseInfo],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportExcel = useCallback(() => {
    if (rows.length === 0) return;

    const escapeForNumFmt = (s: string) => s.replace(/"/g, '""');
    const literal = `"${escapeForNumFmt(baseInfo.symbol)}"`;
    const amountFmt = baseInfo.onRight ? `# ##0.00 ${literal}` : `${literal} # ##0.00`;

    const headers = [
      t("date"),
      t("entry"),
      t("itemCode"),
      t("itemName"),
      t("from"),
      t("to"),
      t("qty"),
      t("uom"),
      t("rate"),
      t("amount"),
    ];

    const aoa: (string | number | null)[][] = [
      headers,
      ...rows.map((r) => [
        r.posting_date,
        r.parent,
        r.item_code,
        r.item_name,
        r.s_warehouse,
        r.t_warehouse,
        r.qty,
        r.uom,
        r.basic_rate,
        r.basic_amount,
      ]),
      [],
      [t("total"), "", "", "", "", "", totalQty, "", "", totalAmount],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 18 },
      { wch: 28 },
      { wch: 22 },
      { wch: 22 },
      { wch: 10 },
      { wch: 8 },
      { wch: 14 },
      { wch: 18 },
    ];

    const amountCols = [8, 9];
    for (let i = 0; i < rows.length; i++) {
      for (const c of amountCols) {
        const addr = XLSX.utils.encode_cell({ r: i + 1, c });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") {
          cell.t = "n";
          cell.z = amountFmt;
        }
      }
    }
    const totalAddr = XLSX.utils.encode_cell({ r: rows.length + 2, c: 9 });
    const totalCell = ws[totalAddr];
    if (totalCell && typeof totalCell.v === "number") {
      totalCell.t = "n";
      totalCell.z = amountFmt;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Warehouse Transfers");
    XLSX.writeFile(wb, `Warehouse-Transfers-${from}-to-${to}.xlsx`);
  }, [rows, totalAmount, totalQty, baseInfo, from, to, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            disabled={rows.length === 0}
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
            {t("dateRange")}
          </label>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("from")}
          </label>
          <LinkField
            doctype="Warehouse"
            value={fromWarehouse}
            onChange={setFromWarehouse}
            placeholder={t("anyWarehouse")}
            className="h-8 w-[200px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("to")}
          </label>
          <LinkField
            doctype="Warehouse"
            value={toWarehouse}
            onChange={setToWarehouse}
            placeholder={t("anyWarehouse")}
            className="h-8 w-[200px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("item")}
          </label>
          <MultiLinkField
            doctype="Item"
            value={items}
            onChange={setItems}
            placeholder={t("allItems")}
            descriptionField="item_name"
            className="h-8 w-[220px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("itemGroup")}
          </label>
          <LinkField
            doctype="Item Group"
            value={itemGroup}
            onChange={setItemGroup}
            placeholder={t("allGroups")}
            className="h-8 w-[180px] text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("totalValue")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(totalAmount, baseInfo.symbol, baseInfo.onRight)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("transferLines")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{totalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("uniqueItems")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{uniqueItemCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("uniqueLanes")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{uniqueLaneCount}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center text-sm">{t("noData")}</div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead
                        key={h.id}
                        className={
                          (h.column.columnDef.meta as { className?: string } | undefined)
                            ?.className
                        }
                      >
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          (cell.column.columnDef.meta as { className?: string } | undefined)
                            ?.className
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
