"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useAgingReport } from "@/hooks/use-aging-report";
import { formatCurrency, formatMultiCurrency } from "@/lib/formatters";
import { getToday } from "@/lib/utils";
import type { AgingBucket } from "@/types/reports";

interface AgingSummaryCardProps {
  type: "receivable" | "payable";
}

export function AgingSummaryCard({ type }: AgingSummaryCardProps) {
  const t = useTranslations("dashboard");
  const tReports = useTranslations("reports");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const reportType = type === "receivable" ? "Accounts Receivable" : "Accounts Payable";
  const { data, isLoading } = useAgingReport(company, getToday(), reportType);
  const { data: currencyMap } = useCurrencyMap();

  const title = type === "receivable" ? t("arAging") : t("apAging");
  const totalLabel = type === "receivable" ? t("totalReceivable") : t("totalPayable");

  const bucketLabelMap: Record<string, string> = {
    Current: tReports("current"),
    "1-30": tReports("overdue1to30"),
    "31-60": tReports("overdue31to60"),
    "61-90": tReports("overdue61to90"),
    "90+": tReports("overdue90plus"),
  };

  const { totalLine, formattedBuckets } = useMemo(() => {
    if (!data) return { totalLine: "", formattedBuckets: [] };

    const breakdown = data.currencyBreakdown;
    const currencies = Object.keys(breakdown);
    const hasMultiCurrency = currencyMap && currencies.length > 1;

    // Format headline total
    let headline: string;
    if (hasMultiCurrency) {
      const amounts = currencies.map((cur) => ({ currency: cur, value: breakdown[cur].total }));
      headline = formatMultiCurrency(amounts, currencyMap);
    } else {
      const total = data.totalOutstanding;
      if (currencies.length === 1 && currencyMap) {
        const cur = currencies[0];
        const info = currencyMap.get(cur);
        headline = formatCurrency(total, info?.symbol ?? cur, info?.onRight ?? false);
      } else {
        headline = formatCurrency(total, currencySymbol, symbolOnRight);
      }
    }

    // Format bucket rows
    const bucketLabels = ["Current", "1-30", "31-60", "61-90", "90+"];
    const bucketRows = bucketLabels.map((label) => {
      if (hasMultiCurrency) {
        const amounts = currencies
          .map((cur) => {
            const bucket = breakdown[cur].buckets.find((b: AgingBucket) => b.label === label);
            return { currency: cur, value: bucket?.amount ?? 0 };
          })
          .filter((a) => a.value !== 0);

        return {
          label,
          formatted:
            amounts.length > 0 ? formatMultiCurrency(amounts, currencyMap) : formatCurrency(0),
        };
      } else {
        const bucket = data.buckets.find((b) => b.label === label);
        const amount = bucket?.amount ?? 0;
        if (currencies.length === 1 && currencyMap) {
          const cur = currencies[0];
          const info = currencyMap.get(cur);
          return {
            label,
            formatted: formatCurrency(amount, info?.symbol ?? cur, info?.onRight ?? false),
          };
        }
        return { label, formatted: formatCurrency(amount, currencySymbol, symbolOnRight) };
      }
    });

    return { totalLine: headline, formattedBuckets: bucketRows };
  }, [data, currencyMap, currencySymbol, symbolOnRight]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-3 h-7 w-32" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{totalLine}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{totalLabel}</p>
        {formattedBuckets.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {formattedBuckets.map((b) => (
              <div key={b.label} className="flex justify-between">
                <span className="text-muted-foreground">{bucketLabelMap[b.label] ?? b.label}</span>
                <span className="font-medium">{b.formatted}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
