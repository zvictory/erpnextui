"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PRODUCTIVITY_COLOR = "#10b981"; // emerald
const EFFICIENCY_COLOR = "#3b82f6"; // blue

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

interface LineComparisonProps {
  data: Array<{
    lineName: string;
    efficiency: number;
    productivity: number;
  }>;
}

export function LineComparison({ data }: LineComparisonProps) {
  // Convert fractions to percentages
  const chartData = data.map((d) => ({
    lineName: d.lineName,
    productivity: +(d.productivity * 100).toFixed(1),
    efficiency: +(d.efficiency * 100).toFixed(1),
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Line Comparison</CardTitle>
          <CardDescription>Productivity and efficiency by line</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No line data available for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Comparison</CardTitle>
        <CardDescription>Productivity and efficiency by line</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradProductivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRODUCTIVITY_COLOR} stopOpacity={1} />
                <stop offset="100%" stopColor={PRODUCTIVITY_COLOR} stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="gradEfficiency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EFFICIENCY_COLOR} stopOpacity={1} />
                <stop offset="100%" stopColor={EFFICIENCY_COLOR} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="lineName" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}%`}
              width={45}
            />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="productivity" fill="url(#gradProductivity)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="efficiency" fill="url(#gradEfficiency)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
