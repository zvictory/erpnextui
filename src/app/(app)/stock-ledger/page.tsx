"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkField } from "@/components/shared/link-field";
import { useStockLedger, useStockLedgerCount } from "@/hooks/use-stock-ledger";
import { formatDate, formatNumber, formatCurrency } from "@/lib/formatters";
import type { StockLedgerEntry } from "@/types/stock-entry";

const PAGE_SIZE = 20;

export default function StockLedgerPage() {
  const t = useTranslations("stock");
  const tc = useTranslations("common");

  const [itemCode, setItemCode] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [page, setPage] = useState(1);

  const { data: entries = [], isLoading } = useStockLedger(itemCode, warehouse, page);
  const { data: totalCount = 0 } = useStockLedgerCount(itemCode, warehouse);

  const hasNext = page * PAGE_SIZE < totalCount;
  const hasPrev = page > 1;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("stockLedger")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("item")}</Label>
          <LinkField
            doctype="Item"
            value={itemCode}
            onChange={(v) => {
              setItemCode(v);
              setPage(1);
            }}
            placeholder={t("selectItem")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("selectWarehouse")}</Label>
          <LinkField
            doctype="Warehouse"
            value={warehouse}
            onChange={(v) => {
              setWarehouse(v);
              setPage(1);
            }}
            placeholder={t("selectWarehouse")}
          />
        </div>
      </div>

      {!itemCode && !warehouse ? (
        <p className="text-muted-foreground py-8 text-center">{t("noStock")}</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("date")}</TableHead>
                  <TableHead>{t("item")}</TableHead>
                  <TableHead>{t("selectWarehouse")}</TableHead>
                  <TableHead className="text-right">{t("actualQty")}</TableHead>
                  <TableHead className="text-right">{t("qtyAfterTransaction")}</TableHead>
                  <TableHead className="text-right">{t("valuationRate")}</TableHead>
                  <TableHead className="text-right">{t("stockValue")}</TableHead>
                  <TableHead>{tc("voucherType")}</TableHead>
                  <TableHead>{tc("voucherNo")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      {t("noEntries")}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry: StockLedgerEntry) => (
                    <TableRow key={entry.name}>
                      <TableCell>{formatDate(entry.posting_date)}</TableCell>
                      <TableCell>{entry.item_name || entry.item_code}</TableCell>
                      <TableCell>{entry.warehouse}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${entry.actual_qty > 0 ? "text-green-600" : entry.actual_qty < 0 ? "text-red-600" : ""}`}
                      >
                        {entry.actual_qty > 0 ? "+" : ""}
                        {formatNumber(entry.actual_qty)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(entry.qty_after_transaction)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.valuation_rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.stock_value)}
                      </TableCell>
                      <TableCell>{entry.voucher_type}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.voucher_no}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {totalCount > 0
                ? `${tc("showing")} ${start}-${end} ${tc("of")} ${totalCount}`
                : tc("noResults")}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
              >
                {tc("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
              >
                {tc("next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
