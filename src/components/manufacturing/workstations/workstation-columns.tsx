"use client";

import { formatNumber } from "@/lib/formatters";
import type { ColumnDef } from "@/components/shared/data-table";
import type { WorkstationListItem } from "@/types/manufacturing";

type TFunc = (key: string) => string;

export function getWorkstationColumns(t: TFunc): ColumnDef<WorkstationListItem>[] {
  return [
    {
      key: "name",
      header: t("name"),
      sortKey: "name",
      className: "min-w-[140px]",
      render: (row) => <span className="font-mono text-sm">{row.name}</span>,
    },
    {
      key: "workstation_name",
      header: t("name"),
      sortKey: "workstation_name",
      className: "min-w-[180px]",
      render: (row) => <span className="font-medium">{row.workstation_name}</span>,
    },
    {
      key: "workstation_type",
      header: t("type"),
      sortKey: "workstation_type",
      className: "min-w-[140px]",
      render: (row) => (
        <span className="text-muted-foreground">{row.workstation_type || "\u2014"}</span>
      ),
    },
    {
      key: "hour_rate",
      header: t("hourRate"),
      sortKey: "hour_rate",
      className: "text-right min-w-[100px]",
      render: (row) => (
        <span className="tabular-nums font-semibold">{formatNumber(row.hour_rate, 2)}</span>
      ),
    },
  ];
}
