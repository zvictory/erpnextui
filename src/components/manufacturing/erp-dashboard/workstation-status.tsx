"use client";

import { useTranslations } from "next-intl";
import { Cog, CircleDot, CirclePause } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobCardListItem, WorkstationListItem } from "@/types/manufacturing";

interface WorkstationStatusProps {
  activeJobs: JobCardListItem[] | undefined;
  workstations: WorkstationListItem[] | undefined;
  isLoading: boolean;
}

interface WorkstationInfo {
  name: string;
  displayName: string;
  busy: boolean;
  operations: { name: string; operation: string; item_name: string }[];
}

export function WorkstationStatus({ activeJobs, workstations, isLoading }: WorkstationStatusProps) {
  const t = useTranslations("mfg.dashboard");

  // Build workstation map: merge all workstations with active job card data
  const stationMap = new Map<string, WorkstationInfo>();

  // Populate from workstation list (all workstations, start as idle)
  if (workstations) {
    for (const ws of workstations) {
      stationMap.set(ws.name, {
        name: ws.name,
        displayName: ws.workstation_name,
        busy: false,
        operations: [],
      });
    }
  }

  // Overlay active job cards (mark as busy)
  if (activeJobs) {
    for (const jc of activeJobs) {
      if (!jc.workstation) continue;
      const existing = stationMap.get(jc.workstation);
      if (existing) {
        existing.busy = true;
        existing.operations.push({
          name: jc.name,
          operation: jc.operation,
          item_name: jc.item_name,
        });
      } else {
        // Workstation from job card not in the workstation list (edge case)
        stationMap.set(jc.workstation, {
          name: jc.workstation,
          displayName: jc.workstation,
          busy: true,
          operations: [{ name: jc.name, operation: jc.operation, item_name: jc.item_name }],
        });
      }
    }
  }

  const stations = Array.from(stationMap.values()).sort((a, b) => {
    // Busy stations first, then alphabetical
    if (a.busy !== b.busy) return a.busy ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("workstationStatus")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : stations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Cog className="mb-3 size-10 opacity-40" />
            <p className="text-sm">No workstations</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {stations.map((ws) => (
              <div
                key={ws.name}
                className={`rounded-lg border p-3 transition-colors ${
                  ws.busy
                    ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
                    : "border-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {ws.busy ? (
                      <CircleDot className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <CirclePause className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-medium" title={ws.displayName}>
                      {ws.displayName}
                    </span>
                  </div>
                  <Badge
                    variant={ws.busy ? "default" : "secondary"}
                    className="shrink-0 text-[11px]"
                  >
                    {ws.busy ? t("busy") : t("idle")}
                  </Badge>
                </div>

                {ws.busy && ws.operations.length > 0 && (
                  <div className="mt-2 space-y-1 pl-6">
                    {ws.operations.map((op) => (
                      <div key={op.name} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{op.operation}</span>
                        {op.item_name && <span className="ml-1">&mdash; {op.item_name}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
