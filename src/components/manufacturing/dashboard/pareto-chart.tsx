"use client";

import { ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const chartConfig = {
  totalMinutes: {
    label: "Downtime (min)",
    color: "hsl(var(--chart-1))",
  },
  cumulativePercentage: {
    label: "Cumulative %",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

function interpolateColor(t: number): string {
  // Interpolate from red (#ef4444) to amber (#f59e0b)
  const r = Math.round(239 + (245 - 239) * t);
  const g = Math.round(68 + (158 - 68) * t);
  const b = Math.round(68 + (11 - 68) * t);
  return `rgb(${r},${g},${b})`;
}

interface ParetoChartProps {
  data: Array<{
    stopCodeName: string | null;
    totalMinutes: number;
    cumulativePercentage: number;
  }>;
}

export function ParetoChart({ data }: ParetoChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Downtime Pareto</CardTitle>
          <CardDescription>Top stop codes by total downtime</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No downtime events recorded for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    stopCodeName:
      (d.stopCodeName ?? "Unknown").length > 12
        ? `${(d.stopCodeName ?? "Unknown").slice(0, 10)}...`
        : (d.stopCodeName ?? "Unknown"),
    totalMinutes: d.totalMinutes,
    cumulativePercentage: +d.cumulativePercentage.toFixed(1),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Downtime Pareto</CardTitle>
        <CardDescription>Top stop codes by total downtime</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {chartData.map((_, i) => {
                const t = chartData.length > 1 ? i / (chartData.length - 1) : 0;
                const color = interpolateColor(t);
                return (
                  <linearGradient key={i} id={`paretoGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="stopCodeName"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) =>
                value.length > 10 ? `${value.slice(0, 8)}...` : value
              }
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}m`}
              width={50}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}%`}
              width={45}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar yAxisId="left" dataKey="totalMinutes" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={`url(#paretoGrad${i})`} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePercentage"
              stroke="var(--color-cumulativePercentage)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              strokeDasharray="6 3"
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
