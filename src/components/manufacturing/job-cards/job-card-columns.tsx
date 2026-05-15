"use client";

import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@/components/shared/data-table";
import type { JobCardListItem, JobCardStatus } from "@/types/manufacturing";

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

export function getJobCardColumns(t: (key: string) => string): ColumnDef<JobCardListItem>[] {
  return [
    {
      key: "name",
      header: "ID",
      sortKey: "name",
      className: "w-[140px]",
      render: (row) => <span className="font-mono text-sm">{row.name}</span>,
    },
    {
      key: "work_order",
      header: t("workOrder"),
      sortKey: "work_order",
      render: (row) => <span className="text-sm">{row.work_order}</span>,
    },
    {
      key: "operation",
      header: t("operation"),
      sortKey: "operation",
      render: (row) => <span className="text-sm">{row.operation}</span>,
    },
    {
      key: "workstation",
      header: t("workstation"),
      sortKey: "workstation",
      render: (row) => <span className="text-sm text-muted-foreground">{row.workstation}</span>,
    },
    {
      key: "qty",
      header: `${t("completedQty")} / ${t("forQty")}`,
      render: (row) => (
        <span className="text-sm tabular-nums">
          {row.total_completed_qty} / {row.for_quantity}
        </span>
      ),
    },
    {
      key: "status",
      header: t("status"),
      sortKey: "status",
      render: (row) => (
        <Badge variant={statusVariant(row.status)} className={statusClassName(row.status)}>
          {t(statusKey(row.status))}
        </Badge>
      ),
    },
  ];
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
