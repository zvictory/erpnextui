"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/formatters";

interface BinItem {
  item_code: string;
  item_name: string;
  actual_qty: number;
  stock_uom: string;
  valuation_rate: number;
  warehouse: string;
}

interface RawMaterialStatusProps {
  data: BinItem[] | undefined;
  isLoading: boolean;
}

const LOW_STOCK_THRESHOLD = 10;

export function RawMaterialStatus({ data, isLoading }: RawMaterialStatusProps) {
  const t = useTranslations("mfg.dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("rawMaterialStatus")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="mb-3 size-10 opacity-40" />
            <p className="text-sm">No stock data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium text-muted-foreground">
                  <th className="pb-2 text-left font-medium">{t("item")}</th>
                  <th className="pb-2 text-right font-medium">{t("available")}</th>
                  <th className="pb-2 text-right font-medium">{t("uom")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const isLow = row.actual_qty < LOW_STOCK_THRESHOLD;
                  return (
                    <tr
                      key={`${row.item_code}-${row.warehouse}-${idx}`}
                      className="border-b last:border-0"
                    >
                      <td className="max-w-[250px] py-2.5 pr-4" title={row.item_code}>
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />}
                          <div className="min-w-0">
                            <div
                              className={`truncate font-medium ${isLow ? "text-amber-700 dark:text-amber-400" : ""}`}
                            >
                              {row.item_name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {row.item_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`py-2.5 text-right tabular-nums ${
                          isLow
                            ? "font-medium text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatNumber(row.actual_qty)}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">{row.stock_uom}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
