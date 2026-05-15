"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockLedger } from "@/hooks/use-stock-ledger";
import { formatDate, formatNumber } from "@/lib/formatters";

// Color palette for up to 8 warehouses
const WAREHOUSE_COLORS = [
  "var(--chart-1, hsl(220 70% 50%))",
  "var(--chart-2, hsl(160 60% 45%))",
  "var(--chart-3, hsl(30 80% 55%))",
  "var(--chart-4, hsl(280 65% 60%))",
  "var(--chart-5, hsl(340 75% 55%))",
  "hsl(200 70% 50%)",
  "hsl(100 50% 45%)",
  "hsl(50 80% 50%)",
];

interface StockMovementChartProps {
  itemCode: string;
}

export function StockMovementChart({ itemCode }: StockMovementChartProps) {
  const t = useTranslations("products.detail");

  // Fetch first page (most recent 20 entries) to show movement
  const { data: entries = [], isLoading } = useStockLedger(itemCode, "", 1);

  const { chartData, warehouses } = useMemo(() => {
    if (entries.length === 0) return { chartData: [], warehouses: [] };

    // Get unique warehouses
    const warehouseSet = new Set(entries.map((e) => e.warehouse));
    const warehouseList = [...warehouseSet];

    // Sort entries chronologically and build chart data
    const sorted = [...entries].sort(
      (a, b) => new Date(a.posting_date).getTime() - new Date(b.posting_date).getTime(),
    );

    const data = sorted.map((entry) => {
      const point: Record<string, string | number> = {
        date: formatDate(entry.posting_date),
        rawDate: entry.posting_date,
      };
      // Set value for this entry's warehouse
      point[entry.warehouse] = entry.qty_after_transaction;
      return point;
    });

    // Forward-fill: carry last known value for each warehouse
    const lastKnown: Record<string, number> = {};
    for (const point of data) {
      for (const wh of warehouseList) {
        if (typeof point[wh] === "number") {
          lastKnown[wh] = point[wh] as number;
        } else if (wh in lastKnown) {
          point[wh] = lastKnown[wh];
        }
      }
    }

    return { chartData: data, warehouses: warehouseList };
  }, [entries]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-muted-foreground py-12 text-center text-sm">{t("noTransactions")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
          {t("stockMovements")}
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" width={60} />
            <Tooltip
              formatter={(value: number, name: string) => [formatNumber(value), name]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--popover)",
                color: "var(--popover-foreground)",
              }}
            />
            {warehouses.map((wh, idx) => (
              <Area
                key={wh}
                type="monotone"
                dataKey={wh}
                stroke={WAREHOUSE_COLORS[idx % WAREHOUSE_COLORS.length]}
                fill={WAREHOUSE_COLORS[idx % WAREHOUSE_COLORS.length]}
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        {/* Legend */}
        {warehouses.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-4">
            {warehouses.map((wh, idx) => (
              <div key={wh} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: WAREHOUSE_COLORS[idx % WAREHOUSE_COLORS.length],
                  }}
                />
                <span className="text-muted-foreground">{wh}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
