"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { RefreshCw, Download, CalendarIcon, Search } from "lucide-react";
import * as XLSX from "xlsx";

import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useAgingReport } from "@/hooks/use-aging-report";
import { ARSummaryCards } from "@/components/reports/ar-summary-cards";
import { ARAgingSummary } from "@/components/reports/ar-aging-summary";
import { ARSummaryTable } from "@/components/reports/ar-summary-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/formatters";

const BUCKET_LABELS = ["Current", "1-30", "31-60", "61-90", "90+"];

export default function AccountsReceivablePage() {
  const t = useTranslations("ar");
  const { company } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();

  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [currency, setCurrency] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isRefetching, refetch } = useAgingReport(
    company,
    asOfDate,
    "Accounts Receivable",
  );

  const filteredRows = useMemo(() => {
    let rows = data?.rows ?? [];
    if (currency) rows = rows.filter((r) => r.currency === currency);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.party_name.toLowerCase().includes(q));
    }
    return rows;
  }, [data?.rows, currency, search]);

  const filteredBreakdown = useMemo(() => {
    if (!currency && !search) return data?.currencyBreakdown ?? {};

    // Recompute breakdown from filtered rows
    const breakdown: Record<
      string,
      { total: number; buckets: { label: string; amount: number; count: number }[] }
    > = {};
    for (const row of filteredRows) {
      const cur = row.currency ?? "—";
      if (!breakdown[cur]) {
        breakdown[cur] = {
          total: 0,
          buckets: BUCKET_LABELS.map((l) => ({ label: l, amount: 0, count: 0 })),
        };
      }
      breakdown[cur].total += row.total_outstanding;
      const amounts = [row.current, row["1-30"], row["31-60"], row["61-90"], row["90+"]];
      for (let i = 0; i < 5; i++) {
        if (amounts[i]) {
          breakdown[cur].buckets[i].amount += amounts[i];
          breakdown[cur].buckets[i].count++;
        }
      }
    }
    return breakdown;
  }, [data?.currencyBreakdown, filteredRows, currency, search]);

  const exportExcel = useCallback(() => {
    if (filteredRows.length === 0) return;

    const wb = XLSX.utils.book_new();

    const byCurrency = new Map<string, typeof filteredRows>();
    for (const row of filteredRows) {
      const cur = row.currency ?? "—";
      const list = byCurrency.get(cur) ?? [];
      list.push(row);
      byCurrency.set(cur, list);
    }

    for (const [cur, rows] of byCurrency) {
      const info = currencyMap?.get(cur);
      const symbol = info?.symbol ?? cur;

      const headers = [
        t("customer"),
        t("notDue"),
        "1-30",
        "31-60",
        "61-90",
        "90+",
        t("outstanding"),
      ];

      const dataRows = rows.map((r) => [
        r.party_name,
        r.current || "",
        r["1-30"] || "",
        r["31-60"] || "",
        r["61-90"] || "",
        r["90+"] || "",
        r.total_outstanding,
      ]);

      const grandTotal = rows.reduce((s, r) => s + r.total_outstanding, 0);
      dataRows.push([]);
      dataRows.push([
        t("total"),
        rows.reduce((s, r) => s + r.current, 0) || "",
        rows.reduce((s, r) => s + r["1-30"], 0) || "",
        rows.reduce((s, r) => s + r["31-60"], 0) || "",
        rows.reduce((s, r) => s + r["61-90"], 0) || "",
        rows.reduce((s, r) => s + r["90+"], 0) || "",
        grandTotal,
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      ws["!cols"] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, `${cur} (${symbol})`);
    }

    XLSX.writeFile(wb, `AR-Summary-${asOfDate}.xlsx`);
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
            <SelectTrigger className="h-8 w-[100px] text-sm">
              <SelectValue placeholder={t("all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCurrencies")}</SelectItem>
              <SelectItem value="UZS">UZS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
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
      <ARSummaryCards
        currencyBreakdown={filteredBreakdown}
        rows={filteredRows}
        isLoading={isLoading}
      />

      {/* Aging Summary */}
      {Object.keys(filteredBreakdown).length > 0 && (
        <ARAgingSummary currencyBreakdown={filteredBreakdown} />
      )}

      {/* Table */}
      <ARSummaryTable rows={filteredRows} />
    </div>
  );
}
