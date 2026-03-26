"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency } from "@/lib/utils";
import type { BalanceSheetSummary } from "@/types/dashboard";

interface BalanceSummaryProps {
  data: BalanceSheetSummary | undefined;
  isLoading: boolean;
}

export function BalanceSummary({ data, isLoading }: BalanceSummaryProps) {
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-7 w-32" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const total = data.totalAssets;
  const items = [
    { label: "Total Assets", value: data.totalAssets, cssColor: "oklch(0.55 0.2 260)" },
    { label: "Total Liabilities", value: data.totalLiabilities, cssColor: "oklch(0.65 0.16 75)" },
    { label: "Total Equity", value: data.totalEquity, cssColor: "oklch(0.6 0.17 155)" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ label, value, cssColor }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(value, currencySymbol, symbolOnRight)}
            </p>
            <div className="mt-3">
              <Progress
                value={total > 0 ? (value / total) * 100 : 0}
                className="h-2 [&>[data-slot=progress-indicator]]:bg-[var(--bar-color)]"
                style={{ "--bar-color": cssColor } as React.CSSProperties}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
