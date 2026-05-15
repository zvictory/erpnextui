"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { useStockLedger, useStockLedgerCount } from "@/hooks/use-stock-ledger";
import { formatDate, formatNumber, formatCurrency } from "@/lib/formatters";
import { useCompanyStore } from "@/stores/company-store";

const PAGE_SIZE = 20;

function voucherRoute(voucherType: string, voucherNo: string): string | null {
  switch (voucherType) {
    case "Stock Entry":
      return `/stock-entries/${encodeURIComponent(voucherNo)}`;
    case "Sales Invoice":
      return `/sales-invoices/${encodeURIComponent(voucherNo)}`;
    case "Purchase Invoice":
      return `/purchase-invoices/${encodeURIComponent(voucherNo)}`;
    default:
      return null;
  }
}

interface TransactionTimelineProps {
  itemCode: string;
}

export function TransactionTimeline({ itemCode }: TransactionTimelineProps) {
  const t = useTranslations("products.detail");
  const tc = useTranslations("common");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const [page, setPage] = useState(1);
  const { data: entries = [], isLoading } = useStockLedger(itemCode, "", page);
  const { data: totalCount = 0 } = useStockLedgerCount(itemCode, "");

  const hasNext = page * PAGE_SIZE < totalCount;
  const hasPrev = page > 1;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("document")}</TableHead>
              <TableHead className="hidden md:table-cell">{tc("voucherType")}</TableHead>
              <TableHead className="text-right">{t("qty")}</TableHead>
              <TableHead className="text-right">{t("balance")}</TableHead>
              <TableHead className="text-right">{t("rate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {t("noTransactions")}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const route = voucherRoute(entry.voucher_type, entry.voucher_no);
                return (
                  <TableRow key={entry.name}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(entry.posting_date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {route ? (
                        <Link href={route} className="text-primary hover:underline">
                          {entry.voucher_no}
                        </Link>
                      ) : (
                        entry.voucher_no
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {entry.voucher_type}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        entry.actual_qty > 0
                          ? "text-green-600 dark:text-green-400"
                          : entry.actual_qty < 0
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }`}
                    >
                      {entry.actual_qty > 0 ? "+" : ""}
                      {formatNumber(entry.actual_qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(entry.qty_after_transaction)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.valuation_rate, currencySymbol, symbolOnRight)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {tc("showing")} {start}-{end} {tc("of")} {totalCount}
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
      )}
    </div>
  );
}
