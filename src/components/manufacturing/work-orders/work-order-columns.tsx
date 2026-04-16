"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WoStatusBadge } from "@/components/manufacturing/work-orders/wo-status-badge";
import { formatDate, formatNumber } from "@/lib/formatters";
import type { ColumnDef } from "@/components/shared/data-table";
import type { WorkOrderListItem } from "@/types/manufacturing";

interface WorkOrderColumnCallbacks {
  onLaborClick?: (row: WorkOrderListItem) => void;
}

export function getWorkOrderColumns(
  t: (key: string) => string,
  callbacks?: WorkOrderColumnCallbacks,
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
    ...(callbacks?.onLaborClick
      ? [
          {
            key: "labor_action",
            header: "",
            className: "w-[48px]",
            render: (row: WorkOrderListItem) => {
              const canAct = row.status === "In Process" || row.status === "Not Started";
              const hasLabor = (row.custom_total_labor_cost ?? 0) > 0;
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canAct}
                  onClick={(e) => {
                    e.stopPropagation();
                    callbacks.onLaborClick!(row);
                  }}
                >
                  <Clock
                    className={`h-4 w-4 ${hasLabor ? "text-primary" : "text-muted-foreground"}`}
                  />
                </Button>
              );
            },
          } satisfies ColumnDef<WorkOrderListItem>,
        ]
      : []),
  ];
}
