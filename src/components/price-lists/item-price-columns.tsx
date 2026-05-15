"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber, formatDate } from "@/lib/formatters";
import type { ColumnDef } from "@/components/shared/data-table";
import type { ItemPrice } from "@/types/price-list";

export function getItemPriceColumns(
  onEdit: (item: ItemPrice) => void,
  onDelete: (item: ItemPrice) => void,
  canDelete: boolean,
  t: (key: string) => string,
): ColumnDef<ItemPrice>[] {
  return [
    {
      key: "item_code",
      header: t("itemCode"),
      sortKey: "item_code",
      render: (row) => <span className="font-medium">{row.item_code}</span>,
    },
    {
      key: "item_name",
      header: t("itemName"),
      sortKey: "item_name",
      render: (row) => <span className="text-muted-foreground">{row.item_name}</span>,
    },
    {
      key: "price_list_rate",
      header: t("rate"),
      sortKey: "price_list_rate",
      className: "text-right",
      render: (row) => (
        <span className="tabular-nums font-medium">{formatNumber(row.price_list_rate)}</span>
      ),
    },
    {
      key: "currency",
      header: t("currency"),
      render: (row) => <span className="text-xs text-muted-foreground">{row.currency}</span>,
    },
    {
      key: "uom",
      header: t("uom"),
      render: (row) => row.uom || "—",
    },
    {
      key: "valid_from",
      header: t("validFrom"),
      render: (row) =>
        row.valid_from ? <span className="text-xs">{formatDate(row.valid_from)}</span> : "—",
    },
    {
      key: "valid_upto",
      header: t("validUpto"),
      render: (row) =>
        row.valid_upto ? <span className="text-xs">{formatDate(row.valid_upto)}</span> : "—",
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              {t("edit")}
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(row)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {t("delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
