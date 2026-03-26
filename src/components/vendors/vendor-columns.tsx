"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@/components/shared/data-table";
import type { SupplierWithBalance } from "@/types/supplier";
import { formatCurrency } from "@/lib/utils";

type TFunc = (key: string) => string;

export function getVendorColumns(
  onDelete: (name: string) => void,
  canDelete = true,
  currencySymbol = "$",
  symbolOnRight = false,
  balancesLoading = false,
  t?: TFunc,
): ColumnDef<SupplierWithBalance>[] {
  const tr = t ?? ((k: string) => k);

  return [
    {
      key: "name",
      header: tr("id"),
      sortKey: "name",
      render: (row) => (
        <Link
          href={`/vendors/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "supplier_name",
      header: tr("supplierName"),
      sortKey: "supplier_name",
      render: (row) => row.supplier_name,
    },
    {
      key: "supplier_type",
      header: tr("type"),
      render: (row) => row.supplier_type,
    },
    {
      key: "supplier_group",
      header: tr("group"),
      render: (row) => row.supplier_group,
    },
    {
      key: "outstanding_balance",
      header: tr("balance"),
      className: "text-right w-32",
      render: (row) => {
        if (balancesLoading || row.outstanding_balance == null) {
          return <Skeleton className="h-4 w-20 ml-auto" />;
        }
        const val = row.outstanding_balance;
        const color =
          val > 0 ? "text-red-600" : val < 0 ? "text-green-600" : "text-muted-foreground";
        return (
          <span className={`tabular-nums ${color}`}>
            {formatCurrency(Math.abs(val), currencySymbol, symbolOnRight)}
          </span>
        );
      },
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
              <Link href={`/vendors/${encodeURIComponent(row.name)}`}>
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
