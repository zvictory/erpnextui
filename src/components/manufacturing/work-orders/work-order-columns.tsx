"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WoStatusBadge } from "@/components/manufacturing/work-orders/wo-status-badge";
import { formatDate, formatNumber } from "@/lib/formatters";
import type { ColumnDef } from "@/components/shared/data-table";
import type { WorkOrderListItem } from "@/types/manufacturing";
import type { TabelSummary } from "@/hooks/use-costing";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
];

interface WorkOrderColumnCallbacks {
  onLaborClick?: (row: WorkOrderListItem) => void;
}

export function getWorkOrderColumns(
  t: (key: string) => string,
  callbacks?: WorkOrderColumnCallbacks,
  tabelSummaries?: Record<string, TabelSummary>,
): ColumnDef<WorkOrderListItem>[] {
  return [
    {
      key: "name",
      header: "ID",
      sortKey: "name",
      className: "min-w-[140px]",
      render: (row) => <span className="font-mono text-xs">{row.name}</span>,
    },
    {
      key: "item_name",
      header: t("productionItem"),
      sortKey: "item_name",
      className: "min-w-[180px]",
      render: (row) => <span className="font-medium">{row.item_name}</span>,
    },
    {
      key: "qty",
      header: t("qty"),
      sortKey: "qty",
      className: "text-right w-[80px]",
      render: (row) => <span className="tabular-nums">{formatNumber(row.qty)}</span>,
    },
    {
      key: "progress",
      header: t("progress"),
      className: "min-w-[140px]",
      render: (row) => {
        const pct = row.qty > 0 ? Math.round((row.produced_qty / row.qty) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <Progress value={pct} className="h-2 flex-1" />
            <span className="text-xs tabular-nums text-muted-foreground w-[36px] text-right">
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: t("status"),
      sortKey: "status",
      className: "w-[120px]",
      render: (row) => <WoStatusBadge status={row.status} />,
    },
    // Ishchilar column
    ...(callbacks?.onLaborClick
      ? [
          {
            key: "ishchilar",
            header: t("workers"),
            className: "min-w-[140px]",
            render: (row: WorkOrderListItem) => {
              const summary = tabelSummaries?.[row.name];
              const hasLabor = (row.custom_labor_hours ?? 0) > 0 && summary;

              if (hasLabor) {
                return (
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      callbacks.onLaborClick!(row);
                    }}
                  >
                    {summary.employees.slice(0, 3).map((emp) => {
                      const colorIdx = emp.name.charCodeAt(0) % AVATAR_COLORS.length;
                      return (
                        <span
                          key={emp.id}
                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold ${AVATAR_COLORS[colorIdx]}`}
                          title={emp.name}
                        >
                          {emp.initials}
                        </span>
                      );
                    })}
                    {summary.employees.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{summary.employees.length - 3}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-1 tabular-nums">
                      {summary.totalHours.toFixed(1)} s
                    </span>
                    <Pencil className="h-3 w-3 text-muted-foreground ml-1" />
                  </div>
                );
              }

              return (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    callbacks.onLaborClick!(row);
                  }}
                >
                  + Tabel
                </Button>
              );
            },
          } satisfies ColumnDef<WorkOrderListItem>,
        ]
      : []),
    {
      key: "planned_start_date",
      header: t("startDate"),
      sortKey: "planned_start_date",
      className: "w-[110px]",
      render: (row) => <span className="text-sm">{formatDate(row.planned_start_date)}</span>,
    },
    {
      key: "custom_total_labor_cost",
      header: t("laborCost"),
      className: "text-right w-[100px]",
      render: (row) =>
        row.custom_total_labor_cost ? (
          <span className="tabular-nums text-sm">{formatNumber(row.custom_total_labor_cost, 0)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "expected_delivery_date",
      header: t("deliveryDate"),
      sortKey: "expected_delivery_date",
      className: "w-[110px]",
      render: (row) => <span className="text-sm">{formatDate(row.expected_delivery_date)}</span>,
    },
  ];
}
