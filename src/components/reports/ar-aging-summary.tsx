"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/formatters";
import { useCurrencyMap } from "@/hooks/use-accounts";
import type { AgingBucket } from "@/types/reports";

const BAR_COLORS = [
  "bg-blue-500", // Current
  "bg-green-500", // 1-30
  "bg-amber-500", // 31-60
  "bg-orange-500", // 61-90
  "bg-red-500", // 90+
];

const BUCKET_LABEL_KEYS = ["notDue", "days0_30", "days31_60", "days61_90", "days90plus"];

interface ARAgingSummaryProps {
  currencyBreakdown: Record<string, { total: number; buckets: AgingBucket[] }>;
}

export function ARAgingSummary({ currencyBreakdown }: ARAgingSummaryProps) {
  const t = useTranslations("ar");
  const { data: currencyMap } = useCurrencyMap();

  const currencies = Object.entries(currencyBreakdown);
  if (currencies.length === 0) return null;

  return (
    <div className="space-y-3">
      {currencies.map(([currency, { buckets }]) => {
        const info = currencyMap?.get(currency);
        const symbol = info?.symbol ?? currency;
        const onRight = info?.onRight ?? false;
        const maxAmount = Math.max(...buckets.map((b) => b.amount), 1);

        return (
          <div key={currency} className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-semibold">{currency}</p>
            <div className="grid grid-cols-5 gap-2">
              {buckets.map((bucket, i) => {
                const pct = (bucket.amount / maxAmount) * 100;
                return (
                  <div key={bucket.label} className="space-y-1">
                    <p className="text-muted-foreground text-[10px] leading-tight">
                      {t(BUCKET_LABEL_KEYS[i])}
                    </p>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full ${BAR_COLORS[i]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium tabular-nums">
                      {formatCurrency(bucket.amount, symbol, onRight)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
