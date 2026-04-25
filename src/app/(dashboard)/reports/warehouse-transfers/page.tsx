"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  RefreshCw,
  Download,
  ArrowUpDown,
  ArrowRight,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
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

type SortKey = "item" | "qty" | "amount" | "transfers" | "lastDate";
type SortDir = "asc" | "desc";

interface ItemAggregate {
  item_code: string;
  item_name: string;
  item_group?: string;
  uom: string;
  totalQty: number;
  totalAmount: number;
  transferCount: number;
  laneCount: number;
  firstDate: string;
  lastDate: string;
  details: TransferRow[];
}

function aggregateByItem(rows: TransferRow[]): ItemAggregate[] {
  const map = new Map<string, ItemAggregate>();
  for (const r of rows) {
    let agg = map.get(r.item_code);
    if (!agg) {
      agg = {
        item_code: r.item_code,
        item_name: r.item_name,
        item_group: r.item_group,
        uom: r.uom,
        totalQty: 0,
        totalAmount: 0,
        transferCount: 0,
        laneCount: 0,
        firstDate: r.posting_date,
        lastDate: r.posting_date,
        details: [],
      };
      map.set(r.item_code, agg);
    }
    agg.totalQty += r.qty ?? 0;
    agg.totalAmount += r.basic_amount ?? 0;
    agg.transferCount += 1;
    agg.details.push(r);
    if (r.posting_date < agg.firstDate) agg.firstDate = r.posting_date;
    if (r.posting_date > agg.lastDate) agg.lastDate = r.posting_date;
  }
  for (const agg of map.values()) {
    const lanes = new Set<string>();
    for (const d of agg.details) lanes.add(`${d.s_warehouse}>${d.t_warehouse}`);
    agg.laneCount = lanes.size;
    agg.details.sort((a, b) => (a.posting_date < b.posting_date ? 1 : -1));
  }
  return Array.from(map.values());
}

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
  const uniqueLaneCount = data?.uniqueLaneCount ?? 0;

  const baseInfo = useMemo(() => {
    const info = baseCurrencyCode ? currencyMap?.get(baseCurrencyCode) : undefined;
    return {
      symbol: info?.symbol ?? baseSymbol,
      onRight: info?.onRight ?? baseOnRight,
    };
  }, [currencyMap, baseCurrencyCode, baseSymbol, baseOnRight]);

  const itemRows = useMemo(() => aggregateByItem(rows), [rows]);

  const sortedItemRows = useMemo(() => {
    const arr = [...itemRows];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "item":
          return a.item_code.localeCompare(b.item_code) * dir;
        case "qty":
          return (a.totalQty - b.totalQty) * dir;
        case "amount":
          return (a.totalAmount - b.totalAmount) * dir;
        case "transfers":
          return (a.transferCount - b.transferCount) * dir;
        case "lastDate":
          return a.lastDate.localeCompare(b.lastDate) * dir;
      }
    });
    return arr;
  }, [itemRows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "item" ? "asc" : "desc");
    }
  };

  const toggleRow = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const allExpanded = expanded.size > 0 && expanded.size === sortedItemRows.length;
  const toggleAll = () => {
    if (allExpanded) setExpanded(new Set());
    else setExpanded(new Set(sortedItemRows.map((r) => r.item_code)));
  };

  const exportExcel = useCallback(() => {
    if (rows.length === 0) return;

    const escapeForNumFmt = (s: string) => s.replace(/"/g, '""');
    const literal = `"${escapeForNumFmt(baseInfo.symbol)}"`;
    const amountFmt = baseInfo.onRight ? `# ##0.00 ${literal}` : `${literal} # ##0.00`;

    const summaryHeaders = [
      t("itemCode"),
      t("itemName"),
      t("uom"),
      t("totalQty"),
      t("transfers"),
      t("uniqueLanes"),
      t("firstDate"),
      t("lastDate"),
      t("amount"),
    ];

    const detailHeaders = [
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

    const summaryAoa: (string | number | null)[][] = [
      summaryHeaders,
      ...sortedItemRows.map((r) => [
        r.item_code,
        r.item_name,
        r.uom,
        r.totalQty,
        r.transferCount,
        r.laneCount,
        r.firstDate,
        r.lastDate,
        r.totalAmount,
      ]),
      [],
      [t("total"), "", "", totalQty, totalCount, uniqueLaneCount, "", "", totalAmount],
    ];

    const detailAoa: (string | number | null)[][] = [
      detailHeaders,
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
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
    wsSummary["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
    ];
    for (let i = 0; i < sortedItemRows.length; i++) {
      const addr = XLSX.utils.encode_cell({ r: i + 1, c: 8 });
      const cell = wsSummary[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = amountFmt;
      }
    }
    const summaryTotalAddr = XLSX.utils.encode_cell({
      r: sortedItemRows.length + 2,
      c: 8,
    });
    const summaryTotalCell = wsSummary[summaryTotalAddr];
    if (summaryTotalCell && typeof summaryTotalCell.v === "number") {
      summaryTotalCell.t = "n";
      summaryTotalCell.z = amountFmt;
    }

    const wsDetails = XLSX.utils.aoa_to_sheet(detailAoa);
    wsDetails["!cols"] = [
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
    for (let i = 0; i < rows.length; i++) {
      for (const c of [8, 9]) {
        const addr = XLSX.utils.encode_cell({ r: i + 1, c });
        const cell = wsDetails[addr];
        if (cell && typeof cell.v === "number") {
          cell.t = "n";
          cell.z = amountFmt;
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "By Item");
    XLSX.utils.book_append_sheet(wb, wsDetails, "Details");
    XLSX.writeFile(wb, `Warehouse-Transfers-${from}-to-${to}.xlsx`);
  }, [rows, sortedItemRows, totalAmount, totalQty, totalCount, uniqueLaneCount, baseInfo, from, to, t]);

  const SortBtn = ({ label, k, align = "left" }: { label: string; k: SortKey; align?: "left" | "right" }) => (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 ${align === "right" ? "-mr-3 ml-auto flex" : "-ml-3"}`}
      onClick={() => toggleSort(k)}
    >
      {label}
      <ArrowUpDown className="ml-1 size-3" />
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          {sortedItemRows.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allExpanded ? t("collapseAll") : t("expandAll")}
            </Button>
          )}
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
                {t("uniqueItems")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{sortedItemRows.length}</p>
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
                {t("uniqueLanes")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{uniqueLaneCount}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Item-grouped table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sortedItemRows.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center text-sm">{t("noData")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>
                    <SortBtn label={t("item")} k="item" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label={t("totalQty")} k="qty" align="right" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label={t("transfers")} k="transfers" align="right" />
                  </TableHead>
                  <TableHead className="text-right">{t("uniqueLanes")}</TableHead>
                  <TableHead>
                    <SortBtn label={t("lastDate")} k="lastDate" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label={t("amount")} k="amount" align="right" />
                  </TableHead>
                  <TableHead className="text-right">{t("pctOfTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItemRows.map((item) => {
                  const isOpen = expanded.has(item.item_code);
                  const pct = totalAmount > 0 ? (item.totalAmount / totalAmount) * 100 : 0;
                  return (
                    <Fragment key={item.item_code}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(item.item_code)}
                      >
                        <TableCell className="w-8">
                          {isOpen ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link
                              href={`/products/${encodeURIComponent(item.item_code)}`}
                              className="font-medium hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.item_code}
                            </Link>
                            <span className="text-muted-foreground text-xs">
                              {item.item_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(item.totalQty)} {item.uom}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.transferCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.laneCount}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {formatDate(item.lastDate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(item.totalAmount, baseInfo.symbol, baseInfo.onRight)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-4 py-2">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-none">
                                    <TableHead className="h-8 text-xs">{t("date")}</TableHead>
                                    <TableHead className="h-8 text-xs">{t("entry")}</TableHead>
                                    <TableHead className="h-8 text-xs">{t("lane")}</TableHead>
                                    <TableHead className="h-8 text-right text-xs">
                                      {t("qty")}
                                    </TableHead>
                                    <TableHead className="h-8 text-right text-xs">
                                      {t("rate")}
                                    </TableHead>
                                    <TableHead className="h-8 text-right text-xs">
                                      {t("amount")}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.details.map((d, idx) => (
                                    <TableRow
                                      key={`${d.parent}-${idx}`}
                                      className="border-none"
                                    >
                                      <TableCell className="py-1 text-xs tabular-nums">
                                        {formatDate(d.posting_date)}
                                      </TableCell>
                                      <TableCell className="py-1 text-xs">
                                        <Link
                                          href={`/stock-entries/${encodeURIComponent(d.parent)}`}
                                          className="hover:underline"
                                        >
                                          {d.parent}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <div className="flex items-center gap-1 text-xs">
                                          <span>{d.s_warehouse}</span>
                                          <ArrowRight className="size-3 shrink-0" />
                                          <span>{d.t_warehouse}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-1 text-right text-xs tabular-nums">
                                        {formatNumber(d.qty)} {d.uom}
                                      </TableCell>
                                      <TableCell className="py-1 text-right text-xs tabular-nums">
                                        {formatCurrency(
                                          d.basic_rate,
                                          baseInfo.symbol,
                                          baseInfo.onRight,
                                        )}
                                      </TableCell>
                                      <TableCell className="py-1 text-right text-xs tabular-nums">
                                        {formatCurrency(
                                          d.basic_amount,
                                          baseInfo.symbol,
                                          baseInfo.onRight,
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {/* Cumulative totals row */}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell />
                  <TableCell>{t("total")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(totalQty)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{totalCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{uniqueLaneCount}</TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totalAmount, baseInfo.symbol, baseInfo.onRight)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
