"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@/components/shared/data-table";
import type { ItemListItem } from "@/types/item";
import { formatCurrency } from "@/lib/utils";

type TFunc = (key: string) => string;

export function getProductColumns(
  currencySymbol: string,
  symbolOnRight: boolean,
  onDelete: (name: string) => void,
  canDelete = true,
  t?: TFunc,
): ColumnDef<ItemListItem>[] {
  const tr = t ?? ((k: string) => k);

  return [
    {
      key: "item_code",
      header: tr("itemCode"),
      sortKey: "item_code",
      render: (row) => (
        <Link
          href={`/products/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.item_code}
        </Link>
      ),
    },
    {
      key: "item_name",
      header: tr("itemName"),
      render: (row) => row.item_name,
    },
    {
      key: "item_group",
      header: tr("group"),
      render: (row) => row.item_group,
    },
    {
      key: "standard_rate",
      header: tr("sellingRate"),
      className: "text-right",
      sortKey: "standard_rate",
      render: (row) => formatCurrency(row.standard_rate ?? 0, currencySymbol, symbolOnRight),
    },
    {
      key: "status",
      header: tr("status"),
      render: (row) =>
        row.disabled ? (
          <Badge variant="secondary">{tr("disabled")}</Badge>
        ) : (
          <Badge variant="default">{tr("active")}</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/products/${encodeURIComponent(row.name)}`}>
                <Pencil className="mr-2 h-4 w-4" />
                {tr("edit")}
              </Link>
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(row.name)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {tr("delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
