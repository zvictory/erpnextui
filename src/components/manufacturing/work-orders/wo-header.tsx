"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WoStatusBadge } from "@/components/manufacturing/work-orders/wo-status-badge";
import { formatNumber } from "@/lib/formatters";
import type { WorkOrder } from "@/types/manufacturing";

interface WoHeaderProps {
  workOrder: WorkOrder;
}

export function WoHeader({ workOrder }: WoHeaderProps) {
  const t = useTranslations("mfg.workOrders");
  const pct = workOrder.qty > 0 ? Math.round((workOrder.produced_qty / workOrder.qty) * 100) : 0;
  const remaining = Math.max(0, workOrder.qty - workOrder.produced_qty);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("progress")}</span>
          <span className="font-medium tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="h-3" />
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("planned")}</p>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(workOrder.qty)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("produced")}</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatNumber(workOrder.produced_qty)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("remaining")}</p>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(remaining)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("status")}</p>
            <div className="mt-1">
              <WoStatusBadge status={workOrder.status} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
