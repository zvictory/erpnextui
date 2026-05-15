"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { useCurrencyMap } from "@/hooks/use-accounts";
import type { AgingBucket, AgingRow } from "@/types/reports";

interface ARSummaryCardsProps {
  currencyBreakdown: Record<string, { total: number; buckets: AgingBucket[] }>;
  rows: AgingRow[];
  isLoading: boolean;
}

export function ARSummaryCards({ currencyBreakdown, rows, isLoading }: ARSummaryCardsProps) {
  const t = useTranslations("ar");
  const { data: currencyMap } = useCurrencyMap();

  const totalCustomers = useMemo(() => {
    const parties = new Set(rows.map((r) => r.party));
    return parties.size;
  }, [rows]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const currencies = Object.entries(currencyBreakdown);
  if (currencies.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {currencies.map(([currency, { total }]) => {
        const info = currencyMap?.get(currency);
        const customerCount = new Set(
          rows.filter((r) => r.currency === currency).map((r) => r.party),
        ).size;
        return (
          <Card key={currency}>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {currency} {t("totalOutstanding")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(total, info?.symbol ?? currency, info?.onRight)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {customerCount} {t("customers")}
              </p>
            </CardContent>
          </Card>
        );
      })}
      <Card>
        <CardContent className="flex items-center gap-3 pt-4 pb-4">
          <div className="bg-muted flex size-10 items-center justify-center rounded-full">
            <Users className="text-muted-foreground size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("totalCustomers")}
            </p>
            <p className="text-2xl font-bold tabular-nums">{totalCustomers}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
