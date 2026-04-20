"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PipelineStage {
  state: string;
  tKey: string;
  count: number;
  color: string;
  href?: string;
}

const PIPELINE_STAGES: Omit<PipelineStage, "count">[] = [
  {
    state: "Submitted",
    tKey: "submitted",
    color: "bg-green-500",
    href: "/sales-orders?workflow_state=Submitted",
  },
  { state: "Pending Pick", tKey: "pendingPick", color: "bg-amber-500", href: "/warehouse/picking" },
  { state: "Picking", tKey: "picking", color: "bg-blue-500", href: "/warehouse/picking" },
  {
    state: "Stock Check",
    tKey: "stockCheck",
    color: "bg-blue-400",
    href: "/warehouse/stock-check",
  },
  { state: "Packed", tKey: "packed", color: "bg-indigo-500", href: "/warehouse/packing" },
  { state: "To Invoice", tKey: "toInvoice", color: "bg-emerald-500", href: "/warehouse/invoicing" },
  {
    state: "Invoiced",
    tKey: "invoiced",
    color: "bg-gray-400",
    href: "/sales-orders?workflow_state=Invoiced",
  },
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
              className={cn(
                "flex items-center justify-center text-white text-xs font-medium transition-all",
                stage.color,
              )}
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
          const content = (
            <div className="flex items-center gap-1.5 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-sm", stage.color)} />
              <span className="text-muted-foreground">{t(stage.tKey)}</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </div>
          );
          return stage.href ? (
            <Link
              key={stage.state}
              href={stage.href}
              className="hover:opacity-80 transition-opacity"
            >
              {content}
            </Link>
          ) : (
            <div key={stage.state}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
