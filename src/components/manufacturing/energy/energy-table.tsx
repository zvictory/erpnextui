"use client";

import { useState, useTransition } from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteEnergyLog } from "@/actions/energy";
import { formatNumber } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// --- Types ------------------------------------------------------------------

export interface EnergyLogRow {
  id: number;
  date: string;
  electricityKwh: number | null;
  gasM3: number | null;
  totalProductionWeightKg: number;
  expectedElectricity: number;
  expectedGas: number;
  electricityVariance: number;
  gasVariance: number;
}

interface EnergyTableProps {
  data: EnergyLogRow[];
}

// --- Helpers ----------------------------------------------------------------

function varianceClass(variance: number): string {
  if (variance <= 0) return "text-green-600 dark:text-green-400";
  return "text-red-600 dark:text-red-400";
}

function formatNum(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return "-";
  return formatNumber(value, decimals);
}

// --- Delete Dialog ----------------------------------------------------------

function DeleteLogDialog({ logId }: { logId: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEnergyLog(logId);
      if (result.success) {
        toast.success("Energy log deleted successfully.");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to delete energy log.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <Trash2 className="size-3 text-destructive" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete energy log?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The energy log entry will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Columns ----------------------------------------------------------------

const columns: ColumnDef<EnergyLogRow>[] = [
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
    accessorKey: "electricityKwh",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Electricity (kWh)
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {formatNum(row.getValue("electricityKwh") as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "gasM3",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Gas (m³)
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {formatNum(row.getValue("gasM3") as number | null, 2)}
      </span>
    ),
  },
  {
    accessorKey: "totalProductionWeightKg",
    header: "Production (kg)",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {formatNum(row.getValue("totalProductionWeightKg") as number, 0)}
      </span>
    ),
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: "expectedElectricity",
    header: "Expected kWh",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {formatNum(row.getValue("expectedElectricity") as number)}
      </span>
    ),
    meta: { className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "expectedGas",
    header: "Expected m³",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {formatNum(row.getValue("expectedGas") as number, 2)}
      </span>
    ),
    meta: { className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "electricityVariance",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Elec. Var.
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const variance = row.getValue("electricityVariance") as number;
      return (
        <span className={`font-mono tabular-nums ${varianceClass(variance)}`}>
          {variance > 0 ? "+" : ""}
          {formatNum(variance)}
        </span>
      );
    },
  },
  {
    accessorKey: "gasVariance",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Gas Var.
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const variance = row.getValue("gasVariance") as number;
      return (
        <span className={`font-mono tabular-nums ${varianceClass(variance)}`}>
          {variance > 0 ? "+" : ""}
          {formatNum(variance, 2)}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <DeleteLogDialog logId={row.original.id} />,
  },
];

// --- Component --------------------------------------------------------------

export function EnergyTable({ data }: EnergyTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <span className="text-xs text-muted-foreground ml-auto">
          {data.length} entr{data.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { className?: string } | undefined;
                  return (
                    <TableHead key={header.id} className={meta?.className}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                    return (
                      <TableCell key={cell.id} className={meta?.className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No energy logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
