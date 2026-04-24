"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth, parse } from "date-fns";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, ChevronDown, Info } from "lucide-react";
import * as XLSX from "xlsx";

import { useCompanyStore } from "@/stores/company-store";
import {
  useSalesAnalyticsReport,
  type SalesAnalyticsFilters,
} from "@/hooks/use-sales-register-report";
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
import { formatNumber } from "@/lib/formatters";
import type { DateRange, SalesAnalyticsDimension } from "@/types/reports";

function monthLabel(ym: string): string {
  const d = parse(`${ym}-01`, "yyyy-MM-dd", new Date());
  return format(d, "MMM yyyy");
}

export default function SalesAnalyticsPage() {
  const t = useTranslations("sa");
  const { company } = useCompanyStore();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [dimension, setDimension] = useState<SalesAnalyticsDimension>("item");
  const [customer, setCustomer] = useState("");
  const [item, setItem] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [territory, setTerritory] = useState("");
  const [brand, setBrand] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const filters: SalesAnalyticsFilters = {
    company,
    from,
    to,
    dimension,
    customer,
    item,
    itemGroup,
    warehouse,
    territory,
    brand,
  };

  const { data, isLoading, isRefetching, refetch } = useSalesAnalyticsReport(filters);
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const months = useMemo(() => data?.months ?? [], [data]);
  const monthlyTotals = useMemo(() => data?.monthlyTotals ?? {}, [data]);
  const totalQty = data?.totalQty ?? 0;
  const lineCount = data?.lineCount ?? 0;
  const uniqueCount = data?.uniqueCount ?? 0;
  const anyMixedUom = data?.anyMixedUom ?? false;

  const dimensionColumnLabel = useMemo(() => {
    switch (dimension) {
      case "item":
        return t("itemCode");
      case "itemGroup":
        return t("itemGroup");
      case "customer":
        return t("customer");
      case "territory":
        return t("territory");
    }
  }, [dimension, t]);

  const exportExcel = useCallback(() => {
    if (rows.length === 0) return;
    const header = [
      dimensionColumnLabel,
      ...(dimension === "item" ? [t("itemName")] : []),
      t("uom"),
      ...months.map(monthLabel),
      t("total"),
    ];
    const body = rows.map((r) => [
      r.label,
      ...(dimension === "item" ? [r.secondaryLabel ?? ""] : []),
      r.mixedUom ? t("mixedUomGroupHint") : r.stockUom ?? "",
      ...months.map((m) => r.monthlyQty[m] ?? 0),
      r.totalQty,
    ]);
    const totalsRow = [
      t("grandTotal"),
      ...(dimension === "item" ? [""] : []),
      "",
      ...months.map((m) => monthlyTotals[m] ?? 0),
      totalQty,
    ];
    const aoa = [header, ...body, [], totalsRow];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const labelCols = dimension === "item" ? 3 : 2;
    ws["!cols"] = [
      { wch: 22 },
      ...(dimension === "item" ? [{ wch: 32 }] : []),
      { wch: 10 },
      ...months.map(() => ({ wch: 14 })),
      { wch: 16 },
    ];
    // Number format for all qty cells.
    const qtyFmt = "#,##0.###";
    const firstQtyCol = labelCols;
    const lastQtyCol = firstQtyCol + months.length;
    for (let r = 1; r <= rows.length; r++) {
      for (let c = firstQtyCol; c <= lastQtyCol; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") cell.z = qtyFmt;
      }
    }
    // Totals row sits after the blank separator.
    const totalsRowIdx = rows.length + 2;
    for (let c = firstQtyCol; c <= lastQtyCol; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalsRowIdx, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") cell.z = qtyFmt;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Analytics");
    XLSX.writeFile(wb, `Sales-Analytics-${dimension}-${from}-to-${to}.xlsx`);
  }, [
    rows,
    months,
    monthlyTotals,
    totalQty,
    dimension,
    dimensionColumnLabel,
    from,
    to,
    t,
  ]);

  const columnCount = 2 + (dimension === "item" ? 1 : 0) + months.length + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
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
              {t("dimension")}
            </label>
            <Select
              value={dimension}
              onValueChange={(v) => setDimension(v as SalesAnalyticsDimension)}
            >
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item">{t("byItem")}</SelectItem>
                <SelectItem value="itemGroup">{t("byItemGroup")}</SelectItem>
                <SelectItem value="customer">{t("byCustomer")}</SelectItem>
                <SelectItem value="territory">{t("byTerritory")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-medium uppercase">
              {t("customerFilter")}
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
                {t("totalQty")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatNumber(totalQty)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {dimension === "customer" ? t("uniqueCustomers") : t("uniqueItems")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{uniqueCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("lineItems")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{lineCount}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {anyMixedUom && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{t("mixedUomNote")}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dimensionColumnLabel}</TableHead>
              {dimension === "item" && <TableHead>{t("itemName")}</TableHead>}
              <TableHead className="text-left">{t("uom")}</TableHead>
              {months.map((m) => (
                <TableHead key={m} className="text-right whitespace-nowrap">
                  {monthLabel(m)}
                </TableHead>
              ))}
              <TableHead className="text-right">{t("total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length > 0 ? (
              <>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {dimension === "item" && (
                      <TableCell className="text-muted-foreground">
                        {row.secondaryLabel}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground text-xs">
                      {row.mixedUom ? t("mixedUomGroupHint") : row.stockUom ?? "—"}
                    </TableCell>
                    {months.map((m) => (
                      <TableCell key={m} className="text-right tabular-nums">
                        {row.monthlyQty[m] ? formatNumber(row.monthlyQty[m]) : "—"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatNumber(row.totalQty)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/30">
                  <TableCell>{t("grandTotal")}</TableCell>
                  {dimension === "item" && <TableCell />}
                  <TableCell />
                  {months.map((m) => (
                    <TableCell key={m} className="text-right tabular-nums">
                      {formatNumber(monthlyTotals[m] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(totalQty)}
                  </TableCell>
                </TableRow>
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
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
