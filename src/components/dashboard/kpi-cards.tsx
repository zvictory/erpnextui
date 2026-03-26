"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/utils";
import type { KpiData } from "@/types/dashboard";

interface KpiCardsProps {
  data: KpiData | undefined;
  isLoading: boolean;
}

const metrics = [
  { key: "totalSales", trendKey: "totalSalesTrend", tKey: "totalSales" },
  { key: "grossProfit", trendKey: "grossProfitTrend", tKey: "grossProfit" },
  { key: "expenses", trendKey: "expensesTrend", tKey: "expenses" },
  { key: "netIncome", trendKey: "netIncomeTrend", tKey: "netIncome" },
] as const;

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  const t = useTranslations("dashboard");
  const { currencyCode, currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const currencyInfo = currencyMap?.get(currencyCode);
  const symbol = currencyInfo?.symbol ?? currencySymbol;
  const onRight = currencyInfo?.onRight ?? symbolOnRight;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-7 w-32" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(({ key, trendKey, tKey }) => {
        const value = data[key];
        const trend = data[trendKey];
        const isPositive = trend >= 0;
        // For expenses, a negative trend (decrease) is actually good
        const isGood = key === "expenses" ? !isPositive : isPositive;

        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t(tKey)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(value, symbol, onRight)}</p>
              <div
                className={`mt-1 flex items-center gap-1 text-xs ${isGood ? "text-emerald-600" : "text-red-600"}`}
              >
                {isPositive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {trend.toFixed(1)}% {t("vsLastPeriod")}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
