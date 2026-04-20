"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPreventiveSchedule, completePreventiveTask } from "@/actions/preventive-schedule";
import { formatDate } from "@/lib/formatters";

interface PreventiveScheduleListProps {
  assetId?: number;
}

export function PreventiveScheduleList({ assetId }: PreventiveScheduleListProps) {
  const t = useTranslations("maintenance");
  const qc = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["preventiveSchedule", { assetId }],
    queryFn: () => getPreventiveSchedule(assetId),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => completePreventiveTask(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("taskCompleted"));
        qc.invalidateQueries({ queryKey: ["preventiveSchedule"] });
      } else {
        toast.error(res.error);
      }
    },
  });

  const tasks = result?.success ? result.data : [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noSchedule")}</p>;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("taskName")}</TableHead>
            {!assetId && <TableHead>{t("asset")}</TableHead>}
            <TableHead>{t("frequency")}</TableHead>
            <TableHead>{t("lastPerformed")}</TableHead>
            <TableHead>{t("nextDue")}</TableHead>
            <TableHead>{t("assignedMechanic")}</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const overdue = task.nextDue <= today;
            return (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.taskName}</TableCell>
                {!assetId && (
                  <TableCell>
                    <Link href={`/assets/${task.assetId}`} className="text-primary hover:underline">
                      {task.assetCode ?? task.assetName ?? `#${task.assetId}`}
                    </Link>
                  </TableCell>
                )}
                <TableCell>
                  {task.frequencyValue} {t(`freq.${task.frequencyType}`)}
                </TableCell>
                <TableCell>{task.lastPerformed ? formatDate(task.lastPerformed) : "—"}</TableCell>
                <TableCell>
                  {overdue ? (
                    <Badge variant="destructive" className="text-xs">
                      {formatDate(task.nextDue)}
                    </Badge>
                  ) : (
                    formatDate(task.nextDue)
                  )}
                </TableCell>
                <TableCell>{task.assignedMechanic ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => completeMutation.mutate(task.id)}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    {t("done")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
