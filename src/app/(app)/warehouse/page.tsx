"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ClipboardCheck,
  PackageCheck,
  PackageOpen,
  Truck,
  CheckCircle2,
  ThumbsUp,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkflowStateCounts } from "@/hooks/use-workflow";
import { useCompanyStore } from "@/stores/company-store";
import { PipelineChart } from "@/components/shared/pipeline-chart";
import type { WorkflowState } from "@/hooks/use-workflow";

interface PipelineStage {
  state: WorkflowState;
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // tailwind bg class
  textColor: string; // tailwind text class
  borderColor: string; // tailwind border class
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    state: "Pending Approval",
    labelKey: "pendingApproval",
    href: "/warehouse/approvals",
    icon: Clock,
    color: "bg-amber-50 dark:bg-amber-950/30",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    state: "Approved",
    labelKey: "approved",
    href: "/sales-invoices?workflow_state=Approved",
    icon: ThumbsUp,
    color: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    state: "Ready for Pickup",
    labelKey: "readyForPickup",
    href: "/warehouse/picking",
    icon: ClipboardCheck,
    color: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    state: "Picked",
    labelKey: "picked",
    href: "/warehouse/packing",
    icon: PackageOpen,
    color: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    state: "Packed",
    labelKey: "packed",
    href: "/warehouse/delivery",
    icon: PackageCheck,
    color: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    state: "Delivered",
    labelKey: "delivered",
    href: "/sales-invoices?workflow_state=Delivered",
    icon: Truck,
    color: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    state: "Completed",
    labelKey: "completed",
    href: "/sales-invoices?workflow_state=Completed",
    icon: CheckCircle2,
    color: "bg-muted/50",
    textColor: "text-muted-foreground",
    borderColor: "border-muted",
  },
];

function PipelineSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="py-4">
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function WarehousePipelinePage() {
  const t = useTranslations("workflow");
  const company = useCompanyStore((s) => s.company);
  const { data: counts, isLoading } = useWorkflowStateCounts(company);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("warehouseWorkflow")}
      </h1>

      {/* Pipeline bar chart */}
      {!isLoading && counts && <PipelineChart counts={counts} className="mb-4" />}

      {isLoading ? (
        <PipelineSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {PIPELINE_STAGES.map((stage, index) => {
            const count = counts?.[stage.state] ?? 0;
            const Icon = stage.icon;

            return (
              <Link key={stage.state} href={stage.href} className="group">
                <Card
                  className={cn(
                    "relative py-4 transition-shadow hover:shadow-md",
                    stage.color,
                    stage.borderColor,
                  )}
                >
                  {/* Arrow connector between cards (hidden on first card and small screens) */}
                  {index > 0 && (
                    <div className="absolute top-1/2 -left-3 hidden -translate-y-1/2 xl:block">
                      <div className="text-muted-foreground/40 text-lg">
                        &rarr;
                      </div>
                    </div>
                  )}
                  <CardContent className="flex flex-col items-start gap-1">
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-medium uppercase tracking-wide",
                          stage.textColor,
                        )}
                      >
                        {t(stage.labelKey)}
                      </span>
                      <Icon
                        className={cn("h-4 w-4 shrink-0", stage.textColor)}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-3xl font-bold tabular-nums",
                        stage.textColor,
                      )}
                    >
                      {count}
                    </span>
                    <span className="text-muted-foreground text-[11px] opacity-0 transition-opacity group-hover:opacity-100">
                      {t("pipeline")} &rarr;
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
