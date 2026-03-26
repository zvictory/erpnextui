"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface PipelineStage {
  state: string;
  tKey: string;
  count: number;
  color: string;
  href?: string;
}

const PIPELINE_STAGES: Omit<PipelineStage, "count">[] = [
  { state: "Pending Approval", tKey: "pendingApproval", color: "bg-amber-500" },
  { state: "Approved", tKey: "approved", color: "bg-green-500" },
  { state: "Ready for Pickup", tKey: "readyForPickup", color: "bg-blue-500", href: "/warehouse/picking" },
  { state: "Picked", tKey: "picked", color: "bg-blue-400", href: "/warehouse/packing" },
  { state: "Packed", tKey: "packed", color: "bg-indigo-500", href: "/warehouse/delivery" },
  { state: "Delivered", tKey: "delivered", color: "bg-emerald-500" },
  { state: "Completed", tKey: "completed", color: "bg-gray-400" },
];

interface PipelineChartProps {
  counts: Record<string, number>;
  className?: string;
}

export function PipelineChart({ counts, className }: PipelineChartProps) {
  const t = useTranslations("workflow");
  const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Bar chart */}
      <div className="flex h-8 rounded-lg overflow-hidden bg-muted">
        {PIPELINE_STAGES.map((stage) => {
          const count = counts[stage.state] ?? 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={stage.state}
              className={cn("flex items-center justify-center text-white text-xs font-medium transition-all", stage.color)}
              style={{ width: `${Math.max(pct, 3)}%` }}
              title={`${t(stage.tKey)}: ${count}`}
            >
              {pct > 8 ? count : ""}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {PIPELINE_STAGES.map((stage) => {
          const count = counts[stage.state] ?? 0;
          return (
            <div key={stage.state} className="flex items-center gap-1.5 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-sm", stage.color)} />
              <span className="text-muted-foreground">{t(stage.tKey)}</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
