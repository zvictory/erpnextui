"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/formatters";
import type { WorkOrderListItem } from "@/types/manufacturing";

interface ProductionTimelineProps {
  data: WorkOrderListItem[] | undefined;
  isLoading: boolean;
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(dateStr);
  delivery.setHours(0, 0, 0, 0);
  return delivery < today;
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "In Process":
      return "default";
    case "Not Started":
      return "secondary";
    case "Completed":
      return "outline";
    case "Stopped":
    case "Cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

export function ProductionTimeline({ data, isLoading }: ProductionTimelineProps) {
  const t = useTranslations("mfg.dashboard");
  const tWo = useTranslations("mfg.workOrders");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("productionTimeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-2 w-32" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="mb-3 size-10 opacity-40" />
            <p className="text-sm">{t("noActiveWOs")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden items-center gap-4 border-b pb-2 text-xs font-medium text-muted-foreground sm:flex">
              <span className="w-28 shrink-0">WO #</span>
              <span className="min-w-0 flex-1">{t("item")}</span>
              <span className="w-36 shrink-0 text-center">{tWo("progress")}</span>
              <span className="w-24 shrink-0 text-center">{tWo("status")}</span>
              <span className="w-24 shrink-0 text-right">{tWo("deliveryDate")}</span>
            </div>

            {data.map((wo) => {
              const pct = wo.qty > 0 ? Math.round((wo.produced_qty / wo.qty) * 100) : 0;
              const overdue = isOverdue(wo.expected_delivery_date);

              return (
                <div
                  key={wo.name}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-4 sm:border-0 sm:p-0"
                >
                  {/* WO Name */}
                  <Link
                    href={`/manufacturing/work-orders/${wo.name}`}
                    className="w-28 shrink-0 truncate font-mono text-sm text-primary hover:underline"
                  >
                    {wo.name}
                  </Link>

                  {/* Item Name */}
                  <span className="min-w-0 flex-1 truncate text-sm" title={wo.item_name}>
                    {wo.item_name}
                  </span>

                  {/* Progress */}
                  <div className="flex w-36 shrink-0 items-center gap-2">
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="w-24 shrink-0 text-center">
                    <Badge variant={statusVariant(wo.status)} className="text-[11px]">
                      {wo.status}
                    </Badge>
                  </div>

                  {/* Delivery Date */}
                  <span
                    className={`w-24 shrink-0 text-right text-xs tabular-nums ${
                      overdue
                        ? "flex items-center justify-end gap-1 font-medium text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {overdue && <AlertTriangle className="size-3" />}
                    {formatDate(wo.expected_delivery_date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
