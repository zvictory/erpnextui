"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, ArrowUpDown } from "lucide-react";
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
import { useSalesByCustomerReport } from "@/hooks/use-sales-register-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkField } from "@/components/shared/link-field";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import type { SalesByCustomerRow, DateRange } from "@/types/reports";

export default function SalesByCustomerPage() {
  const t = useTranslations("sbc");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [customer, setCustomer] = useState("");
  const [item, setItem] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "amount", desc: true }]);

  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

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
  const totalAmount = data?.totalAmount ?? 0;
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
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatCurrency(row.original.amount, currencySymbol, symbolOnRight)}
          </span>
        ),
        meta: { className: "text-right" },
      },
      {
        id: "pct",
        header: t("pctOfTotal"),
        cell: ({ row }) => {
          const pct = totalAmount > 0 ? (row.original.amount / totalAmount) * 100 : 0;
          return <span className="tabular-nums text-xs">{pct.toFixed(1)}%</span>;
        },
        meta: { className: "text-right" },
        enableSorting: false,
      },
    ],
    [t, currencySymbol, symbolOnRight, totalAmount],
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
    const literal = `"${escapeForNumFmt(currencySymbol)}"`;
    const amountFmt = symbolOnRight ? `# ##0.00 ${literal}` : `${literal} # ##0.00`;

    const headers = [
      t("customerCode"),
      t("customerName"),
      t("invoiceCount"),
      t("amount"),
    ];
    const grandInvoices = rows.reduce((s, r) => s + r.invoice_count, 0);

    const aoa: (string | number | null)[][] = [
      headers,
      ...rows.map((r) => [r.customer, r.customer_name, r.invoice_count, r.amount]),
      [],
      [t("total"), "", grandInvoices, totalAmount],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 18 }, { wch: 35 }, { wch: 12 }, { wch: 22 }];

    const amountColIdx = 3;
    for (let i = 1; i < aoa.length; i++) {
      if (aoa[i].length === 0) continue;
      const addr = XLSX.utils.encode_cell({ r: i, c: amountColIdx });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = amountFmt;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales by Customer");
    XLSX.writeFile(wb, `Sales-By-Customer-${from}-to-${to}.xlsx`);
  }, [rows, totalAmount, currencySymbol, symbolOnRight, from, to, t]);

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
            {t("dateRange")}
          </label>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("totalSales")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(totalAmount, currencySymbol, symbolOnRight)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("uniqueCustomers")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{rows.length}</p>
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
                <TableRow className="font-semibold">
                  <TableCell />
                  <TableCell>{t("total")}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totalAmount, currencySymbol, symbolOnRight)}
                  </TableCell>
                  <TableCell />
                </TableRow>
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
