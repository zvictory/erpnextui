"use client";

import { format, parseISO } from "date-fns";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PRODUCTIVITY_COLOR = "#8b5cf6"; // violet
const EFFICIENCY_COLOR = "#f59e0b"; // amber

const chartConfig = {
  productivity: {
    label: "Productivity",
    color: PRODUCTIVITY_COLOR,
  },
  efficiency: {
    label: "Efficiency",
    color: EFFICIENCY_COLOR,
  },
} satisfies ChartConfig;

interface EfficiencyChartProps {
  data: Array<{ date: string; productivity: number; efficiency: number }>;
}

export function EfficiencyChart({ data }: EfficiencyChartProps) {
  // Convert fractions to percentages for display
  const chartData = data.map((d) => ({
    date: d.date,
    productivity: +(d.productivity * 100).toFixed(1),
    efficiency: +(d.efficiency * 100).toFixed(1),
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Efficiency Trend</CardTitle>
          <CardDescription>Productivity and efficiency over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No data available for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Efficiency Trend</CardTitle>
        <CardDescription>Productivity and efficiency over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillProductivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PRODUCTIVITY_COLOR} stopOpacity={0.4} />
                <stop offset="95%" stopColor={PRODUCTIVITY_COLOR} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillEfficiency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EFFICIENCY_COLOR} stopOpacity={0.4} />
                <stop offset="95%" stopColor={EFFICIENCY_COLOR} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => {
                try {
                  return format(parseISO(value), "MMM d");
                } catch {
                  return value;
                }
              }}
              tickMargin={8}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}%`}
              width={45}
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
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
            <Area
              yAxisId="left"
              dataKey="productivity"
              stroke="none"
              fill="url(#fillProductivity)"
              legendType="none"
              tooltipType="none"
            />
            <Area
              yAxisId="right"
              dataKey="efficiency"
              stroke="none"
              fill="url(#fillEfficiency)"
              legendType="none"
              tooltipType="none"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="productivity"
              stroke={PRODUCTIVITY_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="efficiency"
              stroke={EFFICIENCY_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
