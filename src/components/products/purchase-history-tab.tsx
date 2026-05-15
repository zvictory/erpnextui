"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePurchaseHistory, usePurchaseHistoryCount } from "@/hooks/use-items";
import { formatDate, formatNumber, formatCurrency } from "@/lib/formatters";
import { useCompanyStore } from "@/stores/company-store";

const PAGE_SIZE = 20;

interface PurchaseHistoryTabProps {
  itemCode: string;
}

export function PurchaseHistoryTab({ itemCode }: PurchaseHistoryTabProps) {
  const t = useTranslations("products.detail");
  const tc = useTranslations("common");
  const tp = useTranslations("products");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const [page, setPage] = useState(1);
  const { data: items = [], isLoading } = usePurchaseHistory(itemCode, page);
  const { data: totalCount = 0 } = usePurchaseHistoryCount(itemCode);

  const hasNext = page * PAGE_SIZE < totalCount;
  const hasPrev = page > 1;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalCount);

  // Chart data: rate over time sorted chronologically
  const chartData = useMemo(() => {
    if (items.length <= 1) return [];
    return [...items]
      .sort((a, b) => new Date(a.posting_date).getTime() - new Date(b.posting_date).getTime())
      .map((entry) => ({
        date: formatDate(entry.posting_date),
        rate: entry.rate,
      }));
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Price trend chart */}
      {chartData.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
              {t("priceTrend")}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" width={80} />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value, currencySymbol, symbolOnRight),
                    t("rate"),
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--popover)",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--chart-1, hsl(var(--primary)))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Purchase history table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("supplier")}</TableHead>
              <TableHead className="text-right">{t("qty")}</TableHead>
              <TableHead className="text-right">{t("rate")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="hidden md:table-cell">{tp("warehouse")}</TableHead>
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
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {t("noPurchases")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry, idx) => (
                <TableRow key={`${entry.parent}-${idx}`}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(entry.posting_date)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span>{entry.supplier_name || "\u2014"}</span>
                      <Link
                        href={`/purchase-invoices/${encodeURIComponent(entry.parent)}`}
                        className="text-muted-foreground hover:text-primary block font-mono text-xs hover:underline"
                      >
                        {entry.parent}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(entry.qty)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(entry.rate, currencySymbol, symbolOnRight)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(entry.amount, currencySymbol, symbolOnRight)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                    {entry.warehouse}
                  </TableCell>
                </TableRow>
              ))
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
