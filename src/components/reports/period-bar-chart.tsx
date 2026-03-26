"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

interface PeriodBarChartProps {
  title: string;
  data: Record<string, string | number>[] | undefined;
  categories: string[];
  index: string;
  isLoading: boolean;
}

export function PeriodBarChart({ title, data, categories, index, isLoading }: PeriodBarChartProps) {
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const chartConfig: ChartConfig = {};
  categories.forEach((cat, i) => {
    chartConfig[cat] = {
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : data && data.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={index} tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCompactNumber(v)}
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
              {categories.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
              {categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
