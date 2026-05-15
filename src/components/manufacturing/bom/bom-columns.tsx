"use client";

import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/formatters";
import type { ColumnDef } from "@/components/shared/data-table";
import type { BOMListItem } from "@/types/manufacturing";

type TFunc = (key: string) => string;

export function getBomColumns(t: TFunc): ColumnDef<BOMListItem>[] {
  return [
    {
      key: "name",
      header: "BOM",
      sortKey: "name",
      className: "font-mono",
      render: (row) => <span className="font-mono text-sm">{row.name}</span>,
    },
    {
      key: "item_name",
      header: t("item"),
      sortKey: "item_name",
      render: (row) => row.item_name,
    },
    {
      key: "quantity",
      header: t("quantity"),
      className: "text-right",
      render: (row) => <span className="text-right">{formatNumber(row.quantity)}</span>,
    },
    {
      key: "is_active",
      header: t("active"),
      render: (row) =>
        row.is_active ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
            {t("active")}
          </Badge>
        ) : (
          <Badge variant="secondary">{t("inactive")}</Badge>
        ),
    },
    {
      key: "is_default",
      header: t("default"),
      render: (row) => (row.is_default ? <Badge variant="default">{t("default")}</Badge> : null),
    },
    {
      key: "raw_material_cost",
      header: t("materialCost"),
      className: "text-right",
      render: (row) => (
        <span className="text-right tabular-nums">{formatNumber(row.raw_material_cost, 2)}</span>
      ),
    },
    {
      key: "operating_cost",
      header: t("operatingCost"),
      className: "text-right",
      render: (row) => (
        <span className="text-right tabular-nums">{formatNumber(row.operating_cost, 2)}</span>
      ),
    },
    {
      key: "total_cost",
      header: t("totalCost"),
      className: "text-right",
      sortKey: "total_cost",
      render: (row) => (
        <span className="text-right font-semibold tabular-nums">
          {formatNumber(row.total_cost, 2)}
        </span>
      ),
    },
  ];
}
