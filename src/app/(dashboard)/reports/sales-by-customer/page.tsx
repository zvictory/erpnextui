"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, ArrowUpDown, ChevronDown } from "lucide-react";
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
  useSalesByCustomerReport,
  type SalesBasis,
} from "@/hooks/use-sales-register-report";
import { useCurrencyMap, useCurrencies } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkField } from "@/components/shared/link-field";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  const {
    company,
    currencySymbol: baseSymbol,
    symbolOnRight: baseOnRight,
  } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { data: allCurrencies } = useCurrencies();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [basis, setBasis] = useState<SalesBasis>("invoice");
  const [currency, setCurrency] = useState("");
  const [customer, setCustomer] = useState("");
  const [item, setItem] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [salesPerson, setSalesPerson] = useState("");
  const [territory, setTerritory] = useState("");
  const [project, setProject] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [brand, setBrand] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const { data, isLoading, isRefetching, refetch } = useSalesByCustomerReport({
    company,
    from,
    to,
    basis,
    customer,
    item,
    itemGroup,
    customerGroup,
    warehouse,
    salesPerson,
    territory,
    project,
    costCenter,
    brand,
    currency,
  });

  const rows = data?.rows ?? [];
  const totalAmount = data?.totalAmount ?? 0;
  const uniqueCustomerCount = data?.uniqueCustomerCount ?? 0;
  const totalsByCurrency = data?.totalsByCurrency ?? {};
  const dataCurrencies = data?.currencies ?? [];
  const totalInvoices = useMemo(
    () => rows.reduce((s, r) => s + r.invoice_count, 0),
    [rows],
  );

  const resolveCurrency = useCallback(
    (code: string) => {
      const info = code ? currencyMap?.get(code) : undefined;
      return {
        symbol: info?.symbol ?? baseSymbol,
        onRight: info?.onRight ?? baseOnRight,
      };
    },
    [currencyMap, baseSymbol, baseOnRight],
  );

  const splitMode = basis === "invoice" && !currency;
  const multiCurrency = splitMode && dataCurrencies.length > 1;

  const columns = useMemo<ColumnDef<SalesByCustomerRow>[]>(() => {
    const base: ColumnDef<SalesByCustomerRow>[] = [
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
    ];

    if (splitMode) {
      base.push({
        accessorKey: "currency",
        header: t("currency"),
        cell: ({ row }) => {
          const info = resolveCurrency(row.original.currency);
          return (
            <span className="text-muted-foreground tabular-nums text-xs">
              {info.symbol}
            </span>
          );
        },
        meta: { className: "text-right" },
        size: 60,
      });
    }

    base.push(
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
        cell: ({ row }) => {
          const info = resolveCurrency(row.original.currency);
          return (
            <span className="tabular-nums font-medium">
              {formatCurrency(row.original.amount, info.symbol, info.onRight)}
            </span>
          );
        },
        meta: { className: "text-right" },
      },
      {
        id: "pct",
        header: t("pctOfTotal"),
        cell: ({ row }) => {
          const denom = splitMode
            ? (totalsByCurrency[row.original.currency] ?? 0)
            : totalAmount;
          const pct = denom > 0 ? (row.original.amount / denom) * 100 : 0;
          return <span className="tabular-nums text-xs">{pct.toFixed(1)}%</span>;
        },
        meta: { className: "text-right" },
        enableSorting: false,
      },
    );

    return base;
  }, [t, resolveCurrency, splitMode, totalAmount, totalsByCurrency]);

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
    const fmtFor = (code: string) => {
      const info = resolveCurrency(code);
      const literal = `"${escapeForNumFmt(info.symbol)}"`;
      return info.onRight ? `# ##0.00 ${literal}` : `${literal} # ##0.00`;
    };

    const includeCurrencyCol = splitMode;
    const headers = includeCurrencyCol
      ? [
          t("customerCode"),
          t("customerName"),
          t("currency"),
          t("invoiceCount"),
          t("amount"),
        ]
      : [t("customerCode"), t("customerName"), t("invoiceCount"), t("amount")];

    const grandInvoices = rows.reduce((s, r) => s + r.invoice_count, 0);

    const rowToAoa = (r: SalesByCustomerRow) =>
      includeCurrencyCol
        ? [
            r.customer,
            r.customer_name,
            resolveCurrency(r.currency).symbol,
            r.invoice_count,
            r.amount,
          ]
        : [r.customer, r.customer_name, r.invoice_count, r.amount];

    const aoa: (string | number | null)[][] = [
      headers,
      ...rows.map(rowToAoa),
      [],
    ];

    if (splitMode && dataCurrencies.length > 1) {
      for (const code of dataCurrencies) {
        const total = totalsByCurrency[code] ?? 0;
        const sym = resolveCurrency(code).symbol;
        aoa.push(
          includeCurrencyCol
            ? [`${t("total")} (${sym})`, "", sym, "", total]
            : [`${t("total")} (${sym})`, "", "", total],
        );
      }
    } else {
      aoa.push(
        includeCurrencyCol
          ? [t("total"), "", "", grandInvoices, totalAmount]
          : [t("total"), "", grandInvoices, totalAmount],
      );
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = includeCurrencyCol
      ? [{ wch: 18 }, { wch: 35 }, { wch: 8 }, { wch: 12 }, { wch: 22 }]
      : [{ wch: 18 }, { wch: 35 }, { wch: 12 }, { wch: 22 }];

    const amountColIdx = includeCurrencyCol ? 4 : 3;
    for (let i = 0; i < rows.length; i++) {
      const addr = XLSX.utils.encode_cell({ r: i + 1, c: amountColIdx });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = fmtFor(rows[i].currency);
      }
    }
    const totalRowStart = rows.length + 2;
    if (splitMode && dataCurrencies.length > 1) {
      for (let i = 0; i < dataCurrencies.length; i++) {
        const addr = XLSX.utils.encode_cell({ r: totalRowStart + i, c: amountColIdx });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") {
          cell.t = "n";
          cell.z = fmtFor(dataCurrencies[i]);
        }
      }
    } else {
      const addr = XLSX.utils.encode_cell({ r: totalRowStart, c: amountColIdx });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = fmtFor(currency || dataCurrencies[0] || "");
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales by Customer");
    XLSX.writeFile(wb, `Sales-By-Customer-${from}-to-${to}.xlsx`);
  }, [
    rows,
    totalAmount,
    totalsByCurrency,
    dataCurrencies,
    resolveCurrency,
    splitMode,
    currency,
    from,
    to,
    t,
  ]);

  const currencyOptions = useMemo(() => {
    const names = allCurrencies?.map((c) => c.name) ?? [];
    if (currency && !names.includes(currency)) names.push(currency);
    return names.sort();
  }, [allCurrencies, currency]);

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

      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-medium uppercase">
              {t("dateRange")}
            </label>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-medium uppercase">
              {t("currencyBasis")}
            </label>
            <Select value={basis} onValueChange={(v) => setBasis(v as SalesBasis)}>
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">{t("basisBase")}</SelectItem>
                <SelectItem value="invoice">{t("basisInvoice")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {basis === "invoice" && (
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-medium uppercase">
                {t("currency")}
              </label>
              <Select
                value={currency || "__all__"}
                onValueChange={(v) => setCurrency(v === "__all__" ? "" : v)}
              >
                <SelectTrigger size="sm" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("allCurrencies")}</SelectItem>
                  {currencyOptions.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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

        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2 h-7 text-xs">
              <ChevronDown
                className={`mr-1 size-3 transition-transform ${moreOpen ? "rotate-180" : ""}`}
              />
              {t("moreFilters")}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-medium uppercase">
                  {t("warehouse")}
                </label>
                <LinkField
                  doctype="Warehouse"
                  value={warehouse}
                  onChange={setWarehouse}
                  placeholder={t("allWarehouses")}
                  className="h-8 w-[200px] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-medium uppercase">
                  {t("salesPerson")}
                </label>
                <LinkField
                  doctype="Sales Person"
                  value={salesPerson}
                  onChange={setSalesPerson}
                  placeholder={t("allSalesPersons")}
                  className="h-8 w-[200px] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-medium uppercase">
                  {t("territory")}
                </label>
                <LinkField
                  doctype="Territory"
                  value={territory}
                  onChange={setTerritory}
                  placeholder={t("allTerritories")}
                  className="h-8 w-[180px] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-medium uppercase">
                  {t("project")}
                </label>
                <LinkField
                  doctype="Project"
                  value={project}
                  onChange={setProject}
                  placeholder={t("allProjects")}
                  className="h-8 w-[180px] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-medium uppercase">
                  {t("costCenter")}
                </label>
                <LinkField
                  doctype="Cost Center"
                  value={costCenter}
                  onChange={setCostCenter}
                  placeholder={t("allCostCenters")}
                  className="h-8 w-[200px] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-medium uppercase">
                  {t("brand")}
                </label>
                <LinkField
                  doctype="Brand"
                  value={brand}
                  onChange={setBrand}
                  placeholder={t("allBrands")}
                  className="h-8 w-[180px] text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
              {multiCurrency ? (
                <div className="mt-1 space-y-0.5">
                  {dataCurrencies.map((code) => {
                    const info = resolveCurrency(code);
                    return (
                      <p key={code} className="text-xl font-bold tabular-nums">
                        {formatCurrency(
                          totalsByCurrency[code] ?? 0,
                          info.symbol,
                          info.onRight,
                        )}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {(() => {
                    const code = currency || dataCurrencies[0] || "";
                    const info = resolveCurrency(code);
                    return formatCurrency(totalAmount, info.symbol, info.onRight);
                  })()}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("uniqueCustomers")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {uniqueCustomerCount}
              </p>
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
                {multiCurrency ? (
                  dataCurrencies.map((code) => {
                    const info = resolveCurrency(code);
                    const total = totalsByCurrency[code] ?? 0;
                    return (
                      <TableRow key={code} className="font-semibold">
                        <TableCell />
                        <TableCell>
                          {t("total")} ({info.symbol})
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                          {info.symbol}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(total, info.symbol, info.onRight)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow className="font-semibold">
                    <TableCell />
                    <TableCell>{t("total")}</TableCell>
                    <TableCell />
                    {splitMode && <TableCell />}
                    <TableCell />
                    <TableCell className="text-right tabular-nums">
                      {(() => {
                        const code = currency || dataCurrencies[0] || "";
                        const info = resolveCurrency(code);
                        return formatCurrency(totalAmount, info.symbol, info.onRight);
                      })()}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
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
