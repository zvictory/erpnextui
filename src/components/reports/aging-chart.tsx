"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency } from "@/lib/utils";
import type { AgingBucket } from "@/types/reports";

const chartConfig = {
  amount: { label: "Amount", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface AgingChartProps {
  buckets: AgingBucket[] | undefined;
  isLoading: boolean;
}

export function AgingChart({ buckets, isLoading }: AgingChartProps) {
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const chartData = buckets?.map((b) => ({
    bucket: b.label,
    amount: Math.abs(b.amount),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center">
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={80} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatCurrency(value as number, currencySymbol, symbolOnRight)
                    }
                  />
                }
              />
              <Bar dataKey="amount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
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
