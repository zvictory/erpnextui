"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";

interface KpiItem {
  label: string;
  value: number;
  format: "currency" | "number";
}

interface ReportKpiCardsProps {
  items: KpiItem[];
  isLoading: boolean;
  currencySymbol?: string;
  symbolOnRight?: boolean;
}

export function ReportKpiCards({
  items,
  isLoading,
  currencySymbol: currencySymbolProp,
  symbolOnRight: symbolOnRightProp,
}: ReportKpiCardsProps) {
  const store = useCompanyStore();
  const currencySymbol = currencySymbolProp ?? store.currencySymbol;
  const symbolOnRight = symbolOnRightProp ?? store.symbolOnRight;

  if (isLoading) {
    return (
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${Math.min(items.length, 4)}`}>
        {items.map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${Math.min(items.length, 4)}`}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {item.format === "currency"
                ? formatCurrency(item.value, currencySymbol, symbolOnRight)
                : formatCompactNumber(item.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
