"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, startOfWeek, startOfMonth, endOfMonth, endOfWeek } from "date-fns";
import { Download, Users, Clock, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useLaborReport,
  type LaborReportEmployeeRow,
  type LaborReportWorkOrderRow,
  type LaborReportProductRow,
  type LaborReportEntry,
} from "@/hooks/use-labor-report";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatNumber, formatDate } from "@/lib/formatters";
import { exportToExcel } from "@/lib/utils/export-excel";
import type { CostingPeriod } from "@/types/costing";

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

export default function LaborReportPage() {
  const t = useTranslations("laborReport");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>("month");
  const period = useMemo(() => getPeriod(periodLabel), [periodLabel]);
  const { data, isLoading } = useLaborReport(period, company);
  const [drilldownEmployee, setDrilldownEmployee] = useState<LaborReportEmployeeRow | null>(null);

  const fmt = (n: number) => formatCurrency(n, currencySymbol, symbolOnRight);

  const kpi = data?.kpi ?? { totalHours: 0, totalCost: 0, activeWorkers: 0 };
  const byEmployee = data?.byEmployee ?? [];
  const byWorkOrder = data?.byWorkOrder ?? [];
  const byProduct = data?.byProduct ?? [];
  const entriesByEmployee = data?.entriesByEmployee ?? {};

  const filenameBase = `labor-report_${period.from}_${period.to}`;

  const handleExportEmployee = () => {
    exportToExcel(
      byEmployee.map((r) => ({
        employee: r.employee_name,
        hours: r.hours.toFixed(2),
        avgRate: Math.round(r.avgRate),
        cost: Math.round(r.cost),
        workOrders: r.workOrdersTouched,
      })),
      [
        { header: t("employee"), key: "employee", width: 30 },
        { header: t("hours"), key: "hours", width: 12 },
        { header: t("avgRate"), key: "avgRate", width: 14 },
        { header: t("laborCost"), key: "cost", width: 16 },
        { header: t("workOrdersTouched"), key: "workOrders", width: 14 },
      ],
      `${filenameBase}_by-employee`,
    );
  };

  const handleExportWorkOrder = () => {
    exportToExcel(
      byWorkOrder.map((r) => ({
        workOrder: r.workOrder,
        productName: r.productName,
        qty: r.producedQty,
        hours: r.hours.toFixed(2),
        cost: Math.round(r.cost),
        costPerUnit: Math.round(r.costPerUnit),
      })),
      [
        { header: t("workOrder"), key: "workOrder", width: 22 },
        { header: t("product"), key: "productName", width: 28 },
        { header: t("qty"), key: "qty", width: 10 },
        { header: t("hours"), key: "hours", width: 12 },
        { header: t("laborCost"), key: "cost", width: 16 },
        { header: t("costPerUnit"), key: "costPerUnit", width: 14 },
      ],
      `${filenameBase}_by-work-order`,
    );
  };

  const handleExportProduct = () => {
    exportToExcel(
      byProduct.map((r) => ({
        productCode: r.productCode,
        productName: r.productName,
        qty: r.totalProducedQty,
        hours: r.hours.toFixed(2),
        cost: Math.round(r.cost),
        costPerUnit: Math.round(r.costPerUnit),
      })),
      [
        { header: t("product"), key: "productName", width: 28 },
        { header: t("qty"), key: "qty", width: 12 },
        { header: t("hours"), key: "hours", width: 12 },
        { header: t("laborCost"), key: "cost", width: 16 },
        { header: t("costPerUnit"), key: "costPerUnit", width: 14 },
      ],
      `${filenameBase}_by-product`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <ToggleGroup
          type="single"
          value={periodLabel}
          onValueChange={(v) => v && setPeriodLabel(v as PeriodLabel)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="today">{t("today")}</ToggleGroupItem>
          <ToggleGroupItem value="week">{t("week")}</ToggleGroupItem>
          <ToggleGroupItem value="month">{t("month")}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title={t("totalHours")}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          value={isLoading ? null : `${formatNumber(kpi.totalHours)} ${t("hours").toLowerCase()}`}
        />
        <KpiCard
          title={t("totalLaborCost")}
          icon={<Coins className="h-4 w-4 text-muted-foreground" />}
          value={isLoading ? null : fmt(kpi.totalCost)}
        />
        <KpiCard
          title={t("activeWorkers")}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          value={isLoading ? null : formatNumber(kpi.activeWorkers)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employee" className="space-y-3">
        <TabsList>
          <TabsTrigger value="employee">{t("byEmployee")}</TabsTrigger>
          <TabsTrigger value="workOrder">{t("byWorkOrder")}</TabsTrigger>
          <TabsTrigger value="product">{t("byProduct")}</TabsTrigger>
        </TabsList>

        <TabsContent value="employee">
          <ReportTableCard
            onExport={byEmployee.length > 0 ? handleExportEmployee : undefined}
            exportLabel={t("downloadCsv")}
          >
            <EmployeeTable
              rows={byEmployee}
              isLoading={isLoading}
              fmt={fmt}
              onRowClick={setDrilldownEmployee}
              t={t}
            />
          </ReportTableCard>
        </TabsContent>

        <TabsContent value="workOrder">
          <ReportTableCard
            onExport={byWorkOrder.length > 0 ? handleExportWorkOrder : undefined}
            exportLabel={t("downloadCsv")}
          >
            <WorkOrderTable rows={byWorkOrder} isLoading={isLoading} fmt={fmt} t={t} />
          </ReportTableCard>
        </TabsContent>

        <TabsContent value="product">
          <ReportTableCard
            onExport={byProduct.length > 0 ? handleExportProduct : undefined}
            exportLabel={t("downloadCsv")}
          >
            <ProductTable rows={byProduct} isLoading={isLoading} fmt={fmt} t={t} />
          </ReportTableCard>
        </TabsContent>
      </Tabs>

      {/* Drill-down drawer */}
      <Sheet
        open={!!drilldownEmployee}
        onOpenChange={(o) => !o && setDrilldownEmployee(null)}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {drilldownEmployee
                ? t("employeeEntriesTitle", { name: drilldownEmployee.employee_name })
                : ""}
            </SheetTitle>
          </SheetHeader>
          {drilldownEmployee && (
            <EmployeeEntries
              entries={entriesByEmployee[drilldownEmployee.employee] ?? []}
              fmt={fmt}
              t={t}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | null;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportTableCard({
  children,
  onExport,
  exportLabel,
}: {
  children: React.ReactNode;
  onExport?: () => void;
  exportLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-end pb-2">
        <Button variant="outline" size="sm" onClick={onExport} disabled={!onExport}>
          <Download className="h-4 w-4 mr-1" />
          {exportLabel}
        </Button>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

interface TranslatorFn {
  (key: string): string;
}

function EmployeeTable({
  rows,
  isLoading,
  fmt,
  onRowClick,
  t,
}: {
  rows: LaborReportEmployeeRow[];
  isLoading: boolean;
  fmt: (n: number) => string;
  onRowClick: (row: LaborReportEmployeeRow) => void;
  t: TranslatorFn;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("employee")}</TableHead>
          <TableHead className="text-right">{t("hours")}</TableHead>
          <TableHead className="text-right">{t("avgRate")}</TableHead>
          <TableHead className="text-right">{t("laborCost")}</TableHead>
          <TableHead className="text-right">{t("workOrdersTouched")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <SkeletonRows cols={5} />
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
              {t("noData")}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => (
            <TableRow
              key={r.employee}
              onClick={() => onRowClick(r)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">{r.employee_name}</TableCell>
              <TableCell className="text-right tabular-nums">{r.hours.toFixed(1)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(Math.round(r.avgRate))}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">{fmt(r.cost)}</TableCell>
              <TableCell className="text-right tabular-nums">{r.workOrdersTouched}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function WorkOrderTable({
  rows,
  isLoading,
  fmt,
  t,
}: {
  rows: LaborReportWorkOrderRow[];
  isLoading: boolean;
  fmt: (n: number) => string;
  t: TranslatorFn;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("workOrder")}</TableHead>
          <TableHead>{t("product")}</TableHead>
          <TableHead className="text-right">{t("qty")}</TableHead>
          <TableHead className="text-right">{t("hours")}</TableHead>
          <TableHead className="text-right">{t("laborCost")}</TableHead>
          <TableHead className="text-right">{t("costPerUnit")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <SkeletonRows cols={6} />
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
              {t("noData")}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => (
            <TableRow key={r.workOrder}>
              <TableCell className="font-mono text-xs">{r.workOrder}</TableCell>
              <TableCell>{r.productName}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(r.producedQty)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.hours.toFixed(1)}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{fmt(r.cost)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.costPerUnit > 0 ? fmt(Math.round(r.costPerUnit)) : "—"}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function ProductTable({
  rows,
  isLoading,
  fmt,
  t,
}: {
  rows: LaborReportProductRow[];
  isLoading: boolean;
  fmt: (n: number) => string;
  t: TranslatorFn;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("product")}</TableHead>
          <TableHead className="text-right">{t("qty")}</TableHead>
          <TableHead className="text-right">{t("hours")}</TableHead>
          <TableHead className="text-right">{t("laborCost")}</TableHead>
          <TableHead className="text-right">{t("costPerUnit")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <SkeletonRows cols={5} />
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
              {t("noData")}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => (
            <TableRow key={r.productCode}>
              <TableCell className="font-medium">{r.productName}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(r.totalProducedQty)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.hours.toFixed(1)}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{fmt(r.cost)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.costPerUnit > 0 ? fmt(Math.round(r.costPerUnit)) : "—"}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function EmployeeEntries({
  entries,
  fmt,
  t,
}: {
  entries: LaborReportEntry[];
  fmt: (n: number) => string;
  t: TranslatorFn;
}) {
  if (entries.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{t("noData")}</p>;
  }
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalCost = entries.reduce((s, e) => s + e.cost, 0);
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {formatNumber(entries.length)} {t("entries").toLowerCase()}
        </span>
        <span className="font-medium tabular-nums">
          {totalHours.toFixed(1)} {t("hours").toLowerCase()} · {fmt(totalCost)}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("workOrder")}</TableHead>
            <TableHead>{t("product")}</TableHead>
            <TableHead className="text-right">{t("hours")}</TableHead>
            <TableHead className="text-right">{t("laborCost")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.name}>
              <TableCell className="text-xs">{formatDate(e.date)}</TableCell>
              <TableCell className="font-mono text-xs">{e.workOrder}</TableCell>
              <TableCell className="text-xs">{e.productName}</TableCell>
              <TableCell className="text-right tabular-nums">{e.hours.toFixed(1)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(e.cost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
