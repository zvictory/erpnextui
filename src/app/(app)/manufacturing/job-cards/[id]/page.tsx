"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Wrench, MapPin, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCardTimer } from "@/components/manufacturing/job-cards/job-card-timer";
import { MaterialChecklist } from "@/components/manufacturing/job-cards/material-checklist";
import { QualityCheck } from "@/components/manufacturing/job-cards/quality-check";
import { useJobCard } from "@/hooks/use-manufacturing";
import { formatDate } from "@/lib/formatters";
import type { JobCardStatus } from "@/types/manufacturing";

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

export default function JobCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const decodedId = decodeURIComponent(id);
  const t = useTranslations("mfg.jobCards");
  const { data: jobCard, isLoading } = useJobCard(decodedId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[160px] w-full rounded-xl" />
        <Skeleton className="h-[160px] w-full rounded-xl" />
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="mx-auto max-w-lg p-4 text-center">
        <p className="text-muted-foreground">Job Card not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/manufacturing/job-cards">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      {/* Header */}
      <div className="space-y-3">
        {/* Back button + title row */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/manufacturing/job-cards">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold font-mono truncate">{jobCard.name}</h1>
          </div>
          <Badge
            variant={statusVariant(jobCard.status)}
            className={statusClassName(jobCard.status)}
          >
            {t(statusKey(jobCard.status))}
          </Badge>
        </div>

        {/* Info card */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{jobCard.operation}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{jobCard.workstation}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
              <Link
                href={`/manufacturing/work-orders`}
                className="text-primary underline-offset-4 hover:underline truncate"
              >
                {jobCard.work_order}
              </Link>
            </div>
            {jobCard.item_name && (
              <p className="text-sm text-muted-foreground pl-6">{jobCard.item_name}</p>
            )}
            <div className="text-sm text-muted-foreground pl-6">
              {t("completedQty")}: {jobCard.total_completed_qty} / {jobCard.for_quantity}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timer section — the hero */}
      <JobCardTimer jobCard={jobCard} />

      {/* Material Checklist */}
      <MaterialChecklist items={jobCard.items} />

      {/* Quality Check */}
      <QualityCheck
        onResult={(passed, notes) => {
          // Local feedback only; no server sync needed per spec
          console.log("QC result:", { passed, notes });
        }}
      />

      {/* Time Logs */}
      {jobCard.time_logs && jobCard.time_logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("timeLogs")}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {jobCard.time_logs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-mono text-xs">
                      {log.from_time ? formatDate(log.from_time) : "—"}
                    </p>
                    {log.to_time && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatDate(log.to_time)}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-0.5">
                    {log.time_in_mins > 0 && (
                      <p className="font-mono">{Math.round(log.time_in_mins)} min</p>
                    )}
                    {log.completed_qty > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {log.completed_qty} {t("completedQty").toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
