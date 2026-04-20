"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteRunDialog } from "./delete-run-dialog";
import { formatNumber } from "@/lib/formatters";

// --- Unified row type -------------------------------------------------------

export interface ProductionRow {
  /** Unique key: "local-{id}" or "erp-{name}" */
  key: string;
  source: "local" | "work-order";
  date: string;

  // Product info (shared)
  itemCode: string;
  itemName: string;
  qty: number;

  // Local-only (OEE)
  localId?: number;
  shift?: string | null;
  lineName?: string | null;
  totalHours?: number | null;
  productivity?: number | null;
  efficiency?: number | null;

  // ERPNext-only
  stockEntry?: string;
  workOrder?: string;
}

// --- Helpers ----------------------------------------------------------------

function formatPercent(value: number): string {
  return `${formatNumber(value * 100, 1)}%`;
}

function getPercentColor(value: number): string {
  const pct = value * 100;
  if (pct >= 90) return "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400";
  if (pct >= 80) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400";
  return "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
}

// --- Columns ----------------------------------------------------------------

export const columns: ColumnDef<ProductionRow>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue("date") as string;
      try {
        return format(parseISO(dateStr), "dd MMM yyyy");
      } catch {
        return dateStr;
      }
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const source = row.getValue("source") as string;
      if (source === "work-order") {
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px]">
            Work Order
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-[10px]">
          Manual
        </Badge>
      );
    },
  },
  {
    id: "product",
    header: "Product",
    cell: ({ row }) => {
      const code = row.original.itemCode;
      const name = row.original.itemName;
      if (!code && !name) return "-";
      return (
        <div className="max-w-[200px]">
          <div className="font-medium truncate text-sm">{code}</div>
          <div className="text-xs text-muted-foreground truncate">{name}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "qty",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Output
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">{formatNumber(row.getValue("qty") as number)}</span>
    ),
  },
  {
    accessorKey: "shift",
    header: "Shift",
    cell: ({ row }) => {
      const shift = row.original.shift;
      return shift ? (
        <Badge variant="outline">{shift}</Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    accessorKey: "lineName",
    header: "Line",
    cell: ({ row }) => {
      const line = row.original.lineName;
      return line || <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: "workOrder",
    header: "Work Order",
    cell: ({ row }) => {
      const wo = row.original.workOrder;
      if (!wo) return <span className="text-muted-foreground">-</span>;
      return (
        <Link
          href={`/manufacturing/work-orders/${encodeURIComponent(wo)}`}
          className="text-sm text-primary hover:underline font-mono"
        >
          {wo}
        </Link>
      );
    },
  },
  {
    accessorKey: "productivity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Productivity
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.original.productivity;
      if (value == null) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getPercentColor(value)}`}
        >
          {formatPercent(value)}
        </span>
      );
    },
    meta: { className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "efficiency",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Efficiency
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.original.efficiency;
      if (value == null) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getPercentColor(value)}`}
        >
          {formatPercent(value)}
        </span>
      );
    },
    meta: { className: "hidden lg:table-cell" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const r = row.original;
      // Only local runs have edit/delete
      if (r.source !== "local" || !r.localId) return null;
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" asChild>
            <Link href={`/manufacturing/production/${r.localId}/edit`}>
              <Pencil className="size-3" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteRunDialog runId={r.localId} />
        </div>
      );
    },
  },
];
