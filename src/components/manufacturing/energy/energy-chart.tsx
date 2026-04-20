"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

// --- Types ------------------------------------------------------------------

interface EnergyChartDataItem {
  date: string;
  electricityKwh: number | null;
  gasM3: number | null;
}

interface EnergyChartProps {
  data: EnergyChartDataItem[];
}

// --- Chart Config -----------------------------------------------------------

const chartConfig = {
  electricityKwh: {
    label: "Electricity (kWh)",
    color: "hsl(var(--chart-4))",
  },
  gasM3: {
    label: "Gas (m³)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

// --- Component --------------------------------------------------------------

export function EnergyChart({ data }: EnergyChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Energy Consumption Trend</CardTitle>
          <CardDescription>Daily electricity and gas consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No energy data recorded yet. Add entries to see the trend.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by date ascending for the chart
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      electricityKwh: d.electricityKwh ?? 0,
      gasM3: d.gasM3 ?? 0,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Energy Consumption Trend</CardTitle>
        <CardDescription>Daily electricity and gas consumption</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillElectricity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-electricityKwh)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-electricityKwh)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillGas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-gasM3)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-gasM3)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => {
                try {
                  return format(parseISO(value), "dd MMM");
                } catch {
                  return value;
                }
              }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}`}
              width={55}
              label={{
                value: "kWh",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fontSize: 11 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}`}
              width={45}
              label={{
                value: "m³",
                angle: 90,
                position: "insideRight",
                style: { textAnchor: "middle", fontSize: 11 },
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    try {
                      return format(parseISO(String(value)), "dd MMM yyyy");
                    } catch {
                      return String(value);
                    }
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              yAxisId="left"
              dataKey="electricityKwh"
              stroke="none"
              fill="url(#fillElectricity)"
              legendType="none"
              tooltipType="none"
              connectNulls
            />
            <Area
              yAxisId="right"
              dataKey="gasM3"
              stroke="none"
              fill="url(#fillGas)"
              legendType="none"
              tooltipType="none"
              connectNulls
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="electricityKwh"
              stroke="var(--color-electricityKwh)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="gasM3"
              stroke="var(--color-gasM3)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
