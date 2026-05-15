"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
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
import { useSalesHistory, useSalesHistoryCount } from "@/hooks/use-items";
import { formatDate, formatNumber, formatCurrency } from "@/lib/formatters";
import { useCompanyStore } from "@/stores/company-store";

const PAGE_SIZE = 20;

interface SalesHistoryTabProps {
  itemCode: string;
}

export function SalesHistoryTab({ itemCode }: SalesHistoryTabProps) {
  const t = useTranslations("products.detail");
  const tc = useTranslations("common");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const [page, setPage] = useState(1);
  const { data: items = [], isLoading } = useSalesHistory(itemCode, page);
  const { data: totalCount = 0 } = useSalesHistoryCount(itemCode);

  const hasNext = page * PAGE_SIZE < totalCount;
  const hasPrev = page > 1;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalCount);

  // Aggregate qty by month for bar chart
  const chartData = useMemo(() => {
    if (items.length <= 1) return [];
    const monthMap = new Map<string, number>();
    for (const entry of items) {
      const month = entry.posting_date?.slice(0, 7) || "unknown"; // YYYY-MM
      monthMap.set(month, (monthMap.get(month) || 0) + entry.qty);
    }
    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, qty]) => ({ month, qty }));
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Sales trend chart */}
      {chartData.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
              {t("salesTrend")}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" width={60} />
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), t("qty")]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--popover)",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar
                  dataKey="qty"
                  fill="var(--chart-2, hsl(var(--primary)))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sales history table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("customer")}</TableHead>
              <TableHead className="text-right">{t("qty")}</TableHead>
              <TableHead className="text-right">{t("rate")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  {t("noSales")}
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
                      <span>{entry.customer_name || "\u2014"}</span>
                      <Link
                        href={`/sales-invoices/${encodeURIComponent(entry.parent)}`}
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
