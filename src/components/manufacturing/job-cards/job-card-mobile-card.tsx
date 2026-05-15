"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { JobCardListItem, JobCardStatus } from "@/types/manufacturing";

interface JobCardMobileCardProps {
  jobCard: JobCardListItem;
  onClick: () => void;
}

function statusVariant(status: JobCardStatus) {
  switch (status) {
    case "Open":
      return "secondary";
    case "Work In Progress":
      return "default";
    case "Completed":
      return "default";
    case "Cancelled":
      return "outline";
    default:
      return "secondary";
  }
}

function statusClassName(status: JobCardStatus) {
  switch (status) {
    case "Work In Progress":
      return "bg-blue-600 text-white";
    case "Completed":
      return "bg-green-600 text-white";
    default:
      return "";
  }
}

function statusKey(status: JobCardStatus): string {
  switch (status) {
    case "Open":
      return "open";
    case "Work In Progress":
      return "workInProgress";
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
    default:
      return "open";
  }
}

export function JobCardMobileCard({ jobCard, onClick }: JobCardMobileCardProps) {
  const t = useTranslations("mfg.jobCards");
  const progress =
    jobCard.for_quantity > 0
      ? Math.round((jobCard.total_completed_qty / jobCard.for_quantity) * 100)
      : 0;

  return (
    <Card className="cursor-pointer active:scale-[0.98] transition-transform" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        {/* Top row: name + status badge */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold">{jobCard.name}</span>
          <Badge
            variant={statusVariant(jobCard.status)}
            className={statusClassName(jobCard.status)}
          >
            {t(statusKey(jobCard.status))}
          </Badge>
        </div>

        {/* Operation & workstation */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{jobCard.operation}</p>
          <p className="text-xs text-muted-foreground">{jobCard.workstation}</p>
        </div>

        {/* Item name */}
        {jobCard.item_name && (
          <p className="text-xs text-muted-foreground truncate">{jobCard.item_name}</p>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {jobCard.total_completed_qty} / {jobCard.for_quantity}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Work order link */}
        <p className="text-xs text-muted-foreground">
          {t("workOrder")}: {jobCard.work_order}
        </p>
      </CardContent>
    </Card>
  );
}
