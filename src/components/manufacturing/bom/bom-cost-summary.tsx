"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";

interface BomCostSummaryProps {
  materialCost: number;
  operatingCost: number;
}

export function BomCostSummary({ materialCost, operatingCost }: BomCostSummaryProps) {
  const t = useTranslations("mfg.bom");
  const totalCost = materialCost + operatingCost;

  const chartData = [
    { name: t("materialCost"), value: materialCost, color: "#3b82f6" },
    { name: t("operatingCost"), value: operatingCost, color: "#22c55e" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{t("costSummary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost breakdown numbers */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("materialCost")}</p>
            <p className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {formatNumber(materialCost, 2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("operatingCost")}</p>
            <p className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">
              {formatNumber(operatingCost, 2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("totalCost")}</p>
            <p className="text-lg font-bold tabular-nums">{formatNumber(totalCost, 2)}</p>
          </div>
        </div>

        {/* Horizontal bar chart */}
        {totalCost > 0 && (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatNumber(v, 0)} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatNumber(value, 2)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
