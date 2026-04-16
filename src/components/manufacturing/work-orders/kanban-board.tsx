"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/formatters";
import type { WorkOrderListItem, WorkOrderStatus } from "@/types/manufacturing";

interface KanbanBoardProps {
  workOrders: WorkOrderListItem[];
  isLoading: boolean;
}

const KANBAN_COLUMNS: { status: WorkOrderStatus; colorClass: string }[] = [
  { status: "Not Started", colorClass: "border-t-gray-400" },
  { status: "In Process", colorClass: "border-t-blue-500" },
  { status: "Completed", colorClass: "border-t-green-500" },
  { status: "Stopped", colorClass: "border-t-red-500" },
];

export function KanbanBoard({ workOrders, isLoading }: KanbanBoardProps) {
  const t = useTranslations("mfg.workOrders");

  const grouped = useMemo(() => {
    const map: Record<string, WorkOrderListItem[]> = {};
    for (const col of KANBAN_COLUMNS) {
      map[col.status] = [];
    }
    for (const wo of workOrders) {
      if (map[wo.status]) {
        map[wo.status].push(wo);
      }
    }
    return map;
  }, [workOrders]);

  const statusLabel: Record<string, string> = {
    "Not Started": t("notStarted"),
    "In Process": t("inProcess"),
    Completed: t("completed"),
    Stopped: t("stopped"),
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.status} className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[800px] grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const items = grouped[col.status] || [];
          return (
            <div key={col.status} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <span className="text-sm font-medium">{statusLabel[col.status]}</span>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {items.map((wo) => {
                  const pct = wo.qty > 0 ? Math.round((wo.produced_qty / wo.qty) * 100) : 0;
                  return (
                    <Link
                      key={wo.name}
                      href={`/manufacturing/work-orders/${encodeURIComponent(wo.name)}`}
                    >
                      <Card
                        className={`border-t-2 ${col.colorClass} cursor-pointer transition-colors hover:bg-muted/50`}
                      >
                        <CardContent className="space-y-2 p-3">
                          <p className="text-xs font-bold font-mono truncate">{wo.name}</p>
                          <p className="text-sm truncate text-muted-foreground">{wo.item_name}</p>
                          <div className="flex items-center justify-between text-xs tabular-nums">
                            <span>
                              {formatNumber(wo.produced_qty)} / {formatNumber(wo.qty)}
                            </span>
                            <span className="text-muted-foreground">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                          {wo.planned_start_date && (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(wo.planned_start_date)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {items.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">--</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
