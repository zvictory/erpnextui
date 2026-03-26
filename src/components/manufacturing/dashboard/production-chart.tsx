"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const BAR_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
];

const chartConfig = {
  totalOutput: {
    label: "Total Output",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

interface ProductionChartProps {
  data: Array<{ productName: string | null; totalOutput: number }>;
}

export function ProductionChart({ data }: ProductionChartProps) {
  // Take top 10 products only
  const chartData = data.slice(0, 10).map((d) => ({
    productName: d.productName ?? "Unknown",
    totalOutput: d.totalOutput,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Production by Product</CardTitle>
          <CardDescription>Top 10 products by output volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No production data available for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production by Product</CardTitle>
        <CardDescription>Top 10 products by output volume</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {BAR_COLORS.map((color, i) => (
                <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => value.toLocaleString()}
            />
            <YAxis
              type="category"
              dataKey="productName"
              tickLine={false}
              axisLine={false}
              width={100}
              tickFormatter={(value: string) =>
                value.length > 14 ? `${value.slice(0, 12)}...` : value
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    `${Number(value).toLocaleString()} pcs`
                  }
                />
              }
            />
            <Bar
              dataKey="totalOutput"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={`url(#barGrad${i})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
