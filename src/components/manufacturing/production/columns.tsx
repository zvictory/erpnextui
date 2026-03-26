"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteRunDialog } from "./delete-run-dialog";

// --- Types ------------------------------------------------------------------

export interface ProductionRunRow {
  id: number;
  date: string;
  shift: string | null;
  lineId: number | null;
  productId: number | null;
  actualOutput: number;
  totalHours: number;
  plannedStopHours: number | null;
  createdAt: string | null;
  productCode: string | null;
  productName: string | null;
  nominalSpeed: number | null;
  productWeightKg: number | null;
  lineName: string | null;
  netWorkHours: number;
  plannedWorkHours: number;
  unplannedStopHours: number;
  productivity: number;
  efficiency: number;
}

// --- Helpers ----------------------------------------------------------------

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getPercentColor(value: number): string {
  const pct = value * 100;
  if (pct >= 90) return "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400";
  if (pct >= 80) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400";
  return "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
}

// --- Columns ----------------------------------------------------------------

export const columns: ColumnDef<ProductionRunRow>[] = [
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
    accessorKey: "shift",
    header: "Shift",
    cell: ({ row }) => {
      const shift = row.getValue("shift") as string | null;
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
    cell: ({ row }) => row.getValue("lineName") ?? "-",
  },
  {
    id: "product",
    header: "Product",
    cell: ({ row }) => {
      const code = row.original.productCode;
      const name = row.original.productName;
      if (!code && !name) return "-";
      return (
        <div className="max-w-[200px]">
          <div className="font-medium truncate">{code}</div>
          <div className="text-xs text-muted-foreground truncate">{name}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "actualOutput",
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
      <span className="font-mono tabular-nums">
        {formatNumber(row.getValue("actualOutput") as number)}
      </span>
    ),
  },
  {
    accessorKey: "totalHours",
    header: "Total Hrs",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {(row.getValue("totalHours") as number).toFixed(1)}
      </span>
    ),
    meta: { className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "netWorkHours",
    header: "Net Work Hrs",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {(row.getValue("netWorkHours") as number).toFixed(2)}
      </span>
    ),
    meta: { className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "plannedWorkHours",
    header: "Planned Hrs",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {(row.getValue("plannedWorkHours") as number).toFixed(2)}
      </span>
    ),
    meta: { className: "hidden xl:table-cell" },
  },
  {
    accessorKey: "unplannedStopHours",
    header: "Unplanned",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {(row.getValue("unplannedStopHours") as number).toFixed(2)}
      </span>
    ),
    meta: { className: "hidden xl:table-cell" },
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
      const value = row.getValue("productivity") as number;
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getPercentColor(value)}`}
        >
          {formatPercent(value)}
        </span>
      );
    },
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
      const value = row.getValue("efficiency") as number;
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getPercentColor(value)}`}
        >
          {formatPercent(value)}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const run = row.original;
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" asChild>
            <Link href={`/production/${run.id}/edit`}>
              <Pencil className="size-3" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteRunDialog runId={run.id} />
        </div>
      );
    },
  },
];
