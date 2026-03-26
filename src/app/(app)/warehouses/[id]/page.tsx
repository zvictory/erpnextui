"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useWarehouse } from "@/hooks/use-warehouses";
import { useWarehouseBins } from "@/hooks/use-stock-ledger";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import { useCompanyStore } from "@/stores/company-store";
import type { BinEntry } from "@/types/stock-entry";

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const warehouseName = decodeURIComponent(params.id as string);
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const { data: warehouse, isLoading: whLoading } = useWarehouse(warehouseName);
  const { data: bins = [], isLoading: binsLoading } = useWarehouseBins(warehouseName);

  const isLoading = whLoading || binsLoading;

  function exportToExcel() {
    if (bins.length === 0) return;
    const header = [t("item"), t("qty"), t("valuationRate"), t("stockValue")];
    const rows = bins.map((bin: BinEntry) => [
      bin.item_name || bin.item_code,
      bin.actual_qty,
      bin.valuation_rate,
      bin.stock_value,
    ]);

    // Build TSV (Excel-compatible via .xls with HTML table)
    let html = "<html><head><meta charset='utf-8'></head><body>";
    html += `<h2>${warehouse?.warehouse_name ?? warehouseName}</h2>`;
    html += "<table border='1'><tr>";
    header.forEach((h) => (html += `<th>${h}</th>`));
    html += "</tr>";
    rows.forEach((row) => {
      html += "<tr>";
      row.forEach((cell) => (html += `<td>${cell}</td>`));
      html += "</tr>";
    });
    html += "</table></body></html>";

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${warehouse?.warehouse_name ?? warehouseName}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {whLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-2xl font-semibold">{warehouse?.warehouse_name ?? warehouseName}</h1>
          )}
        </div>
        {bins.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="mr-1.5 h-4 w-4" />
            Excel
          </Button>
        )}
      </div>

      <h2 className="text-lg font-medium">{t("warehouseStock")}</h2>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("item")}</TableHead>
              <TableHead className="text-right">{t("qty")}</TableHead>
              <TableHead className="text-right">{t("valuationRate")}</TableHead>
              <TableHead className="text-right">{t("stockValue")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t("noStock")}
                </TableCell>
              </TableRow>
            ) : (
              bins.map((bin: BinEntry) => (
                <TableRow key={`${bin.item_code}-${bin.warehouse}`}>
                  <TableCell>{bin.item_name || bin.item_code}</TableCell>
                  <TableCell className="text-right">{formatNumber(bin.actual_qty)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bin.valuation_rate, currencySymbol, symbolOnRight)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bin.stock_value, currencySymbol, symbolOnRight)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && bins.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {tc("showing")} {bins.length} {t("item").toLowerCase()}(s)
        </p>
      )}
    </div>
  );
}
