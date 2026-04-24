"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, CalendarIcon, ArrowUpDown } from "lucide-react";
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
import { useSalesByCustomerReport } from "@/hooks/use-sales-register-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkField } from "@/components/shared/link-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import type { SalesByCustomerRow } from "@/types/reports";

export default function SalesByCustomerPage() {
  const t = useTranslations("sbc");
  const { company } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();

  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customer, setCustomer] = useState("");
  const [item, setItem] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "amount", desc: true }]);

  const { data, isLoading, isRefetching, refetch } = useSalesByCustomerReport({
    company,
    from,
    to,
    customer,
    item,
    itemGroup,
    customerGroup,
  });

  const rows = data?.rows ?? [];
  const breakdown = data?.currencyBreakdown ?? {};

  const uniqueCustomers = useMemo(
    () => new Set(rows.map((r) => r.customer)).size,
    [rows],
  );
  const totalInvoices = useMemo(
    () => rows.reduce((s, r) => s + r.invoice_count, 0),
    [rows],
  );

  const columns = useMemo<ColumnDef<SalesByCustomerRow>[]>(
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
        accessorKey: "customer",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("customerCode")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Link
            href={`/customers/${encodeURIComponent(row.original.customer)}`}
            className="font-medium hover:underline"
          >
            {row.original.customer}
          </Link>
        ),
      },
      {
        accessorKey: "customer_name",
        header: t("customerName"),
        cell: ({ row }) => <span>{row.original.customer_name}</span>,
      },
      {
        accessorKey: "invoice_count",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("invoiceCount")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.invoice_count}</span>
        ),
        meta: { className: "text-right" },
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
        accessorKey: "amount",
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
        cell: ({ row }) => {
          const cur = row.original.currency;
          const info = currencyMap?.get(cur);
          return (
            <span className="tabular-nums font-medium">
              {formatCurrency(row.original.amount, info?.symbol ?? cur, info?.onRight)}
            </span>
          );
        },
        meta: { className: "text-right" },
      },
      {
        id: "pct",
        header: t("pctOfTotal"),
        cell: ({ row }) => {
          const cb = breakdown[row.original.currency];
          const pct = cb && cb.total > 0 ? (row.original.amount / cb.total) * 100 : 0;
          return <span className="tabular-nums text-xs">{pct.toFixed(1)}%</span>;
        },
        meta: { className: "text-right" },
        enableSorting: false,
      },
    ],
    [t, currencyMap, breakdown],
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

    const wb = XLSX.utils.book_new();
    const byCurrency = new Map<string, SalesByCustomerRow[]>();
    for (const r of rows) {
      const key = r.currency || "Unknown";
      const list = byCurrency.get(key) ?? [];
      list.push(r);
      byCurrency.set(key, list);
    }

    const escapeForNumFmt = (s: string) => s.replace(/"/g, '""');

    for (const [cur, list] of byCurrency) {
      const info = currencyMap?.get(cur);
      const symbol = info?.symbol ?? cur;
      const onRight = info?.onRight ?? true;
      const literal = `"${escapeForNumFmt(symbol)}"`;
      const amountFmt = onRight ? `# ##0.00 ${literal}` : `${literal} # ##0.00`;

      const headers = [
        t("customerCode"),
        t("customerName"),
        t("invoiceCount"),
        t("currency"),
        t("amount"),
      ];
      const grandTotal = list.reduce((s, r) => s + r.amount, 0);
      const grandInvoices = list.reduce((s, r) => s + r.invoice_count, 0);

      const aoa: (string | number | null)[][] = [
        headers,
        ...list.map((r) => [r.customer, r.customer_name, r.invoice_count, cur, r.amount]),
        [],
        [t("total"), "", grandInvoices, cur, grandTotal],
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 18 }, { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 20 }];

      const amountColIdx = 4;
      for (let i = 1; i < aoa.length; i++) {
        if (aoa[i].length === 0) continue;
        const addr = XLSX.utils.encode_cell({ r: i, c: amountColIdx });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") {
          cell.t = "n";
          cell.z = amountFmt;
        }
      }

      const rawName = `${cur} (${symbol})`;
      const safeName = rawName.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    }

    XLSX.writeFile(wb, `Sales-By-Customer-${from}-to-${to}.xlsx`);
  }, [rows, currencyMap, from, to, t]);

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

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("fromDate")}
          </label>
          <div className="relative">
            <CalendarIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-[160px] pl-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("toDate")}
          </label>
          <div className="relative">
            <CalendarIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-[160px] pl-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("customer")}
          </label>
          <LinkField
            doctype="Customer"
            value={customer}
            onChange={setCustomer}
            placeholder={t("allCustomers")}
            descriptionField="customer_name"
            className="h-8 w-[220px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("item")}
          </label>
          <LinkField
            doctype="Item"
            value={item}
            onChange={setItem}
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
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase">
            {t("customerGroup")}
          </label>
          <LinkField
            doctype="Customer Group"
            value={customerGroup}
            onChange={setCustomerGroup}
            placeholder={t("allGroups")}
            className="h-8 w-[180px] text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : Object.keys(breakdown).length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(breakdown).map(([cur, { total }]) => {
            const info = currencyMap?.get(cur);
            return (
              <Card key={cur}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {cur} {t("totalSales")}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatCurrency(total, info?.symbol ?? cur, info?.onRight)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("uniqueCustomers")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{uniqueCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("totalInvoices")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{totalInvoices}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
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
                      const meta = cell.column.columnDef.meta as
                        | { className?: string }
                        | undefined;
                      return (
                        <TableCell key={cell.id} className={meta?.className}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {Object.entries(breakdown).map(([cur, { total }]) => {
                  const info = currencyMap?.get(cur);
                  return (
                    <TableRow key={`total-${cur}`} className="font-semibold">
                      <TableCell />
                      <TableCell>
                        {t("total")} ({cur})
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(total, info?.symbol ?? cur, info?.onRight)}
                      </TableCell>
                      <TableCell />
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
