"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
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
  useSalesByItemReport,
  useSalesByItemDetailReport,
} from "@/hooks/use-sales-register-report";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkField } from "@/components/shared/link-field";
import { MultiLinkField } from "@/components/shared/multi-link-field";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatDate } from "@/lib/formatters";
import type { SalesByItemRow, DateRange, SalesByItemDetailGroup } from "@/types/reports";

export default function SalesByItemPage() {
  const t = useTranslations("sbi");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode: "summary" | "detail" =
    searchParams.get("mode") === "detail" ? "detail" : "summary";
  const setMode = (next: "summary" | "detail") => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "summary") sp.delete("mode");
    else sp.set("mode", "detail");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };
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
  const [customers, setCustomers] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
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

  const filters = {
    company,
    from,
    to,
    customers,
    items,
    itemGroup,
    customerGroup,
    warehouse,
    salesPerson,
    territory,
    project,
    costCenter,
    brand,
  };
  const summaryQ = useSalesByItemReport(filters);
  const detailQ = useSalesByItemDetailReport(mode === "detail" ? filters : { ...filters, company: "" });
  const { data, isLoading, isRefetching, refetch } = summaryQ;
  const detailData = mode === "detail" ? detailQ.data : undefined;
  const detailLoading = mode === "detail" && detailQ.isLoading;

  const rows = data?.rows ?? [];
  const totalsByCurrency = data?.totalsByCurrency ?? {};
  const totalCount = data?.totalCount ?? 0;
  const uniqueItemCount = data?.uniqueItemCount ?? 0;

  const baseInfo = useMemo(() => {
    const info = baseCurrencyCode ? currencyMap?.get(baseCurrencyCode) : undefined;
    return {
      symbol: info?.symbol ?? baseSymbol,
      onRight: info?.onRight ?? baseOnRight,
    };
  }, [currencyMap, baseCurrencyCode, baseSymbol, baseOnRight]);

  const getCurrencyInfo = useCallback(
    (code: string) => {
      const info = code ? currencyMap?.get(code) : undefined;
      return {
        symbol: info?.symbol ?? code ?? baseInfo.symbol,
        onRight: info?.onRight ?? baseInfo.onRight,
      };
    },
    [currencyMap, baseInfo],
  );

  const currencyEntries = useMemo(
    () => Object.entries(totalsByCurrency).sort(([, a], [, b]) => b - a) as [string, number][],
    [totalsByCurrency],
  );

  const columns = useMemo<ColumnDef<SalesByItemRow>[]>(() => {
    const base: ColumnDef<SalesByItemRow>[] = [
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
        accessorKey: "item_code",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("itemCode")}
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Link
            href={`/products/${encodeURIComponent(row.original.item_code)}`}
            className="font-medium hover:underline"
          >
            {row.original.item_code}
          </Link>
        ),
      },
      {
        accessorKey: "item_name",
        header: t("itemName"),
        cell: ({ row }) => <span>{row.original.item_name}</span>,
      },
    ];

    base.push(
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
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.qty)}</span>,
        meta: { className: "text-right" },
      },
      {
        accessorKey: "currency",
        header: t("currency"),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.currency}</span>
        ),
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
          const info = getCurrencyInfo(row.original.currency);
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
          const denom = totalsByCurrency[row.original.currency] ?? 0;
          const pct = denom > 0 ? (row.original.amount / denom) * 100 : 0;
          return <span className="tabular-nums text-xs">{pct.toFixed(1)}%</span>;
        },
        meta: { className: "text-right" },
        enableSorting: false,
      },
    );

    return base;
  }, [t, getCurrencyInfo, totalsByCurrency]);

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
      const info = getCurrencyInfo(code);
      const literal = `"${escapeForNumFmt(info.symbol)}"`;
      return info.onRight ? `# ##0.00 ${literal}` : `${literal} # ##0.00`;
    };

    const headers = [t("itemCode"), t("itemName"), t("currency"), t("qty"), t("amount")];
    const grandQty = rows.reduce((s, r) => s + r.qty, 0);

    const totalRows: (string | number | null)[][] = currencyEntries.map(([code, total], idx) => [
      idx === 0 ? t("total") : "",
      "",
      code,
      idx === 0 ? grandQty : "",
      total,
    ]);

    const aoa: (string | number | null)[][] = [
      headers,
      ...rows.map((r) => [r.item_code, r.item_name, r.currency, r.qty, r.amount]),
      [],
      ...totalRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 20 }, { wch: 35 }, { wch: 8 }, { wch: 12 }, { wch: 22 }];

    const amountColIdx = 4;
    for (let i = 0; i < rows.length; i++) {
      const addr = XLSX.utils.encode_cell({ r: i + 1, c: amountColIdx });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = fmtFor(rows[i].currency);
      }
    }
    const totalsStart = rows.length + 2;
    currencyEntries.forEach(([code], idx) => {
      const addr = XLSX.utils.encode_cell({ r: totalsStart + idx, c: amountColIdx });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = fmtFor(code);
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales by Item");
    XLSX.writeFile(wb, `Sales-By-Item-${from}-to-${to}.xlsx`);
  }, [rows, currencyEntries, getCurrencyInfo, from, to, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5">
            <Button
              variant={mode === "summary" ? "default" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setMode("summary")}
            >
              {t("summaryMode")}
            </Button>
            <Button
              variant={mode === "detail" ? "default" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setMode("detail")}
            >
              {t("detailMode")}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
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
              {t("customer")}
            </label>
            <MultiLinkField
              doctype="Customer"
              value={customers}
              onChange={setCustomers}
              placeholder={t("allCustomers")}
              descriptionField="customer_name"
              className="h-8 w-[220px] text-sm"
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

      {mode === "detail" ? (
        <DetailView
          groups={detailData?.groups ?? []}
          loading={detailLoading}
          getCurrencyInfo={getCurrencyInfo}
          t={t}
        />
      ) : (<>
      {/* KPI Cards */}
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
              <div className="mt-1 space-y-0.5">
                {currencyEntries.length > 0 ? (
                  currencyEntries.map(([code, total]) => {
                    const info = getCurrencyInfo(code);
                    return (
                      <p key={code} className="text-2xl font-bold tabular-nums leading-tight">
                        {formatCurrency(total, info.symbol, info.onRight)}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrency(0, baseInfo.symbol, baseInfo.onRight)}
                  </p>
                )}
              </div>
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
                {t("lineItems")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{totalCount}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Table */}
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
                <TableRow className="font-semibold">
                  <TableCell />
                  <TableCell>{t("total")}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    <div className="space-y-0.5">
                      {currencyEntries.map(([code, total]) => {
                        const info = getCurrencyInfo(code);
                        return (
                          <div key={code} className="leading-tight">
                            {formatCurrency(total, info.symbol, info.onRight)}
                          </div>
                        );
                      })}
                    </div>
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
      </>)}
    </div>
  );
}

function DetailView({
  groups,
  loading,
  getCurrencyInfo,
  t,
}: {
  groups: SalesByItemDetailGroup[];
  loading: boolean;
  getCurrencyInfo: (code: string) => { symbol: string; onRight: boolean };
  t: (k: string) => string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center text-muted-foreground">{t("noData")}</div>
    );
  }
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <DetailGroupCard key={g.groupKey} group={g} getCurrencyInfo={getCurrencyInfo} t={t} />
      ))}
    </div>
  );
}

function DetailGroupCard({
  group,
  getCurrencyInfo,
  t,
}: {
  group: SalesByItemDetailGroup;
  getCurrencyInfo: (code: string) => { symbol: string; onRight: boolean };
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const info = getCurrencyInfo(group.currency);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
        >
          <ChevronRight
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/products/${encodeURIComponent(group.itemCode)}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium hover:underline truncate"
              >
                {group.itemCode}
              </Link>
              <span className="text-muted-foreground text-sm truncate">{group.itemName}</span>
            </div>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {group.lineCount} {t("lines")}
          </span>
          <span className="tabular-nums text-sm">
            {formatNumber(group.totalQty)} {group.stockUom ?? ""}
          </span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(group.totalAmount, info.symbol, info.onRight)}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("invoice")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead className="text-right">{t("qty")}</TableHead>
                <TableHead>{t("uom")}</TableHead>
                <TableHead className="text-right">{t("rate")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.lines.map((l, i) => (
                <TableRow key={`${l.invoice}-${i}`}>
                  <TableCell className="text-xs">{formatDate(l.posting_date)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/sales-invoices/${encodeURIComponent(l.invoice)}`}
                      className="hover:underline font-mono text-xs"
                    >
                      {l.invoice}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/customers/${encodeURIComponent(l.customer)}`}
                      className="hover:underline text-sm"
                    >
                      {l.customer_name || l.customer}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(l.qty)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.stock_uom ?? ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(l.rate, info.symbol, info.onRight)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(l.amount, info.symbol, info.onRight)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
