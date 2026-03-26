"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useCompanyStore } from "@/stores/company-store";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";
import type { SalesTrendPoint } from "@/types/dashboard";

const chartConfig = {
  amount: {
    label: "Sales",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface SalesChartProps {
  data: SalesTrendPoint[] | undefined;
  isLoading: boolean;
}

export function SalesChart({ data, isLoading }: SalesChartProps) {
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Trend (30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : data && data.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => v.split(" ")[1]?.replace(",", "") ?? v}
                interval="preserveStartEnd"
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatCompactNumber(v)}
                fontSize={12}
                width={48}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatCurrency(value as number, currencySymbol, symbolOnRight)
                    }
                  />
                }
              />
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
