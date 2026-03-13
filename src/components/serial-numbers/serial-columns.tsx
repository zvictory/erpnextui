"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@/components/shared/data-table";
import type { SerialNumberListItem } from "@/types/serial-number";

type TFunc = (key: string) => string;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  Active: "default",
  Delivered: "secondary",
  Expired: "outline",
  Inactive: "outline",
};

export function getSerialNumberColumns(t: TFunc): ColumnDef<SerialNumberListItem>[] {
  return [
    {
      key: "name",
      header: t("serialNo"),
      sortKey: "name",
      render: (row) => (
        <Link
          href={`/serial-numbers/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "item_code",
      header: t("item"),
      render: (row) => (
        <span>
          {row.item_code}
          {row.item_name && row.item_name !== row.item_code && (
            <span className="ml-1 text-muted-foreground">— {row.item_name}</span>
          )}
        </span>
      ),
    },
    {
      key: "custom_imei_1",
      header: "IMEI 1",
      render: (row) => <span className="font-mono text-xs">{row.custom_imei_1 || "—"}</span>,
    },
    {
      key: "custom_imei_2",
      header: "IMEI 2",
      render: (row) => <span className="font-mono text-xs">{row.custom_imei_2 || "—"}</span>,
    },
    {
      key: "warehouse",
      header: t("warehouse"),
      render: (row) => row.warehouse || "—",
    },
    {
      key: "status",
      header: t("status"),
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{row.status}</Badge>
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
              <Link href={`/serial-numbers/${encodeURIComponent(row.name)}`}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("edit")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
