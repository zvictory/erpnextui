"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/formatters";
import type { WorkOrderOperation } from "@/types/manufacturing";

interface WoOperationsTabProps {
  operations: WorkOrderOperation[];
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Completed") {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  }
  if (status === "Work In Progress") {
    return <Clock className="h-4 w-4 text-blue-500" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

export function WoOperationsTab({ operations }: WoOperationsTabProps) {
  const t = useTranslations("mfg.workOrders");

  if (operations.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("operations")} --</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]"></TableHead>
            <TableHead>{t("operation")}</TableHead>
            <TableHead>{t("workstation")}</TableHead>
            <TableHead className="text-right">{t("plannedTime")}</TableHead>
            <TableHead className="text-right">{t("actualTime")}</TableHead>
            <TableHead className="text-right">{t("qty")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations.map((op, idx) => (
            <TableRow key={`${op.operation}-${idx}`}>
              <TableCell>
                <StatusIcon status={op.status} />
              </TableCell>
              <TableCell className="font-medium">{op.operation}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {op.workstation || "--"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(op.time_in_mins)} min
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(op.actual_operation_time)} min
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(op.completed_qty)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
