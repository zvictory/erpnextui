"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, startOfWeek, startOfMonth, endOfMonth, endOfWeek } from "date-fns";
import {
  Boxes,
  HardHat,
  Zap,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useCumulativeCosts,
  useProductCostBreakdown,
  useVarianceAnalysis,
  useWorkstationEnergyAllocation,
} from "@/hooks/use-costing";
import { useCompanyStore } from "@/stores/company-store";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import type { CostingPeriod, AllocationMethod } from "@/types/costing";

type PeriodLabel = "today" | "week" | "month";

function getPeriod(label: PeriodLabel): CostingPeriod {
  const today = new Date();
  switch (label) {
    case "today":
      return {
        from: format(today, "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
        label: "today",
      };
    case "week":
      return {
        from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        label: "week",
      };
    case "month":
      return {
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: format(endOfMonth(today), "yyyy-MM-dd"),
        label: "month",
      };
  }
}

export default function CostingDashboardPage() {
  const t = useTranslations("costing");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>("month");
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>("qty");

  const period = useMemo(() => getPeriod(periodLabel), [periodLabel]);

  const { data: costs, isLoading: costsLoading } = useCumulativeCosts(period, company);
  const { data: products = [], isLoading: productsLoading } = useProductCostBreakdown(
    period,
    company,
    allocationMethod,
  );
  const { data: variance, isLoading: varianceLoading } = useVarianceAnalysis(period, company);
  const { data: energyAlloc = [], isLoading: energyLoading } = useWorkstationEnergyAllocation(
    period,
    company,
  );

  const fmt = (n: number) => formatCurrency(n, currencySymbol, symbolOnRight);

  // Product totals
  const productTotals = useMemo(() => {
    return products.reduce(
      (acc, p) => ({
        produced_qty: acc.produced_qty + p.produced_qty,
        raw_material_cost: acc.raw_material_cost + p.raw_material_cost,
        labor_cost: acc.labor_cost + p.labor_cost,
        energy_cost: acc.energy_cost + p.energy_cost,
        depreciation_cost: acc.depreciation_cost + p.depreciation_cost,
        total_cost: acc.total_cost + p.total_cost,
      }),
      {
        produced_qty: 0,
        raw_material_cost: 0,
        labor_cost: 0,
        energy_cost: 0,
        depreciation_cost: 0,
        total_cost: 0,
      },
    );
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>
        <ToggleGroup
          type="single"
          value={periodLabel}
          onValueChange={(v) => v && setPeriodLabel(v as PeriodLabel)}
          size="sm"
        >
          <ToggleGroupItem value="today">{t("today")}</ToggleGroupItem>
          <ToggleGroupItem value="week">{t("week")}</ToggleGroupItem>
          <ToggleGroupItem value="month">{t("month")}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Section A — Cumulative Costs */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("cumulative_costs")}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CostMetricCard
            icon={<Boxes className="h-4 w-4" />}
            label={t("raw_materials")}
            value={costs?.raw_materials}
            loading={costsLoading}
            fmt={fmt}
          />
          <CostMetricCard
            icon={<HardHat className="h-4 w-4" />}
            label={t("labor")}
            value={costs?.labor}
            loading={costsLoading}
            fmt={fmt}
          />
          <CostMetricCard
            icon={<Zap className="h-4 w-4" />}
            label={t("energy")}
            value={costs?.energy}
            loading={costsLoading}
            fmt={fmt}
          />
          <CostMetricCard
            icon={<Landmark className="h-4 w-4" />}
            label={t("depreciation")}
            value={costs?.depreciation}
            loading={costsLoading}
            fmt={fmt}
          />
        </div>

        {/* Cost composition bar */}
        {costs && costs.total > 0 && (
          <div className="mt-4">
            <div className="flex h-3 rounded-full overflow-hidden">
              <div
                className="bg-blue-500"
                style={{ width: `${(costs.raw_materials / costs.total) * 100}%` }}
                title={t("raw_materials")}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${(costs.labor / costs.total) * 100}%` }}
                title={t("labor")}
              />
              <div
                className="bg-emerald-500"
                style={{ width: `${(costs.energy / costs.total) * 100}%` }}
                title={t("energy")}
              />
              <div
                className="bg-purple-500"
                style={{ width: `${(costs.depreciation / costs.total) * 100}%` }}
                title={t("depreciation")}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {t("raw_materials")} {((costs.raw_materials / costs.total) * 100).toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {t("labor")} {((costs.labor / costs.total) * 100).toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("energy")} {((costs.energy / costs.total) * 100).toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                {t("depreciation")} {((costs.depreciation / costs.total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section B — Allocation Methods + Product Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("allocation_method")}</h2>
          <ToggleGroup
            type="single"
            value={allocationMethod}
            onValueChange={(v) => v && setAllocationMethod(v as AllocationMethod)}
            size="sm"
          >
            <ToggleGroupItem value="qty">{t("by_qty")}</ToggleGroupItem>
            <ToggleGroupItem value="hours">{t("by_hours")}</ToggleGroupItem>
            <ToggleGroupItem value="value">{t("by_value")}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("product")}</TableHead>
                <TableHead className="text-right">{t("producedQty")}</TableHead>
                <TableHead className="text-right">{t("raw_materials")}</TableHead>
                <TableHead className="text-right">{t("labor")}</TableHead>
                <TableHead className="text-right">{t("energy")}</TableHead>
                <TableHead className="text-right">{t("depreciation")}</TableHead>
                <TableHead className="text-right">{t("totalCost")}</TableHead>
                <TableHead className="text-right">{t("costPerUnit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    {t("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.item_code}>
                    <TableCell className="font-medium">{p.item_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(p.produced_qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(p.raw_material_cost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(p.labor_cost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(p.energy_cost)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(p.depreciation_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmt(p.total_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmt(p.cost_per_unit)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {products.length > 1 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">{t("total")}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {formatNumber(productTotals.produced_qty)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmt(productTotals.raw_material_cost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmt(productTotals.labor_cost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmt(productTotals.energy_cost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmt(productTotals.depreciation_cost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmt(productTotals.total_cost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {productTotals.produced_qty > 0
                      ? fmt(Math.round(productTotals.total_cost / productTotals.produced_qty))
                      : "—"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </Card>
      </div>

      {/* Energy Allocation by Workstation */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("energyAllocation")}</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("workstation")}</TableHead>
                <TableHead className="text-right">{t("powerKw")}</TableHead>
                <TableHead className="text-right">{t("sharePct")}</TableHead>
                <TableHead className="text-right">{t("energyAmount")}</TableHead>
                <TableHead className="text-right">{t("hourlyRate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {energyLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : energyAlloc.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    {t("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                energyAlloc.map((ws) => (
                  <TableRow key={ws.name}>
                    <TableCell className="font-medium">{ws.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{ws.power_kw} kW</TableCell>
                    <TableCell className="text-right tabular-nums">{ws.share_pct}%</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(ws.energy_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(ws.hourly_rate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Section C — Variance Analysis */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("varianceTitle")}</h2>
        {varianceLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-7 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : variance ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{t("absorbed")}</p>
                  <p className="text-xl font-bold tabular-nums">{fmt(variance.absorbed)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("absorbedHint")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{t("actual")}</p>
                  <p className="text-xl font-bold tabular-nums">{fmt(variance.actual)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("actualHint")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{t("variance")}</p>
                  <p
                    className={`text-xl font-bold tabular-nums ${
                      variance.variance > 0
                        ? "text-red-600"
                        : variance.variance < 0
                          ? "text-green-600"
                          : ""
                    }`}
                  >
                    {variance.variance > 0 ? "+" : ""}
                    {fmt(variance.variance)} ({variance.variance_pct.toFixed(1)}%)
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-3">
              <CardContent className="p-4 flex items-start gap-3">
                {variance.recommendation === "normal" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : variance.recommendation === "under_absorbed" ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {variance.recommendation === "normal"
                      ? t("varianceNormal")
                      : variance.recommendation === "under_absorbed"
                        ? t("under_absorbed")
                        : t("over_absorbed")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {variance.recommendation === "normal"
                      ? t("varianceNormalDesc")
                      : variance.recommendation === "under_absorbed"
                        ? t("underAbsorbedDesc", { pct: Math.abs(variance.variance_pct).toFixed(1) })
                        : t("overAbsorbedDesc", { pct: Math.abs(variance.variance_pct).toFixed(1) })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CostMetricCard({
  icon,
  label,
  value,
  loading,
  fmt,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  fmt: (n: number) => string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-muted-foreground">{icon}</span>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <p className="text-lg font-bold tabular-nums">{fmt(value ?? 0)}</p>
        )}
      </CardContent>
    </Card>
  );
}
