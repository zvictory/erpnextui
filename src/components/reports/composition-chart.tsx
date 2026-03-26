"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
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

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

interface CompositionChartProps {
  data: { name: string; value: number }[] | undefined;
  isLoading: boolean;
}

export function CompositionChart({ data, isLoading }: CompositionChartProps) {
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const chartConfig: ChartConfig = {};
  data?.forEach((item, i) => {
    chartConfig[item.name] = {
      label: item.name,
      color: COLORS[i % COLORS.length],
    };
  });

  const total = data?.reduce((sum, item) => sum + item.value, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composition</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center">
            <Skeleton className="size-[200px] rounded-full" />
          </div>
        ) : data && data.length > 0 ? (
          <ChartContainer config={chartConfig} className="mx-auto h-[250px] w-full">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatCurrency(value as number, currencySymbol, symbolOnRight)
                    }
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-lg font-bold"
                          >
                            {formatCompactNumber(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
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
