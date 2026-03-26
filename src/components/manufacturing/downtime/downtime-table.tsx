"use client";

import { useState, useMemo, useTransition } from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { ArrowUpDown, CalendarIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteDowntimeEvent } from "@/actions/downtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export interface DowntimeEventRow {
  id: number;
  date: string;
  lineId: number | null;
  stopCodeId: number | null;
  durationMinutes: number;
  notes: string | null;
  stopCodeCode: string | null;
  stopCodeName: string | null;
  stopCodeCategory: string | null;
  lineName: string | null;
}

interface LineOption {
  id: number;
  name: string;
}

interface DowntimeTableProps {
  data: DowntimeEventRow[];
  lines: LineOption[];
}

// --- Helpers ----------------------------------------------------------------

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getCategoryColor(category: string | null): string {
  switch (category?.toLowerCase()) {
    case "mechanical":
      return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400";
    case "electrical":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400";
    case "process":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400";
    case "quality":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400";
    case "changeover":
      return "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400";
    case "planned":
      return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400";
    default:
      return "";
  }
}

// --- Delete Dialog ----------------------------------------------------------

function DeleteEventDialog({ eventId }: { eventId: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDowntimeEvent(eventId);
      if (result.success) {
        toast.success("Downtime event deleted successfully.");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to delete downtime event.");
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
          <AlertDialogTitle>Delete downtime event?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The downtime event will be permanently
            removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Columns ----------------------------------------------------------------

const columns: ColumnDef<DowntimeEventRow>[] = [
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
    accessorKey: "lineName",
    header: "Line",
    cell: ({ row }) => row.getValue("lineName") ?? "-",
  },
  {
    accessorKey: "stopCodeCode",
    header: "Stop Code",
    cell: ({ row }) => {
      const code = row.getValue("stopCodeCode") as string | null;
      return code ? (
        <span className="font-mono text-xs">{code}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    accessorKey: "stopCodeName",
    header: "Description",
    cell: ({ row }) => {
      const name = row.getValue("stopCodeName") as string | null;
      return (
        <span className="max-w-[200px] truncate block">
          {name ?? "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "stopCodeCategory",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("stopCodeCategory") as string | null;
      if (!category) return <span className="text-muted-foreground">-</span>;
      return (
        <Badge variant="secondary" className={getCategoryColor(category)}>
          {category}
        </Badge>
      );
    },
  },
  {
    accessorKey: "durationMinutes",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Duration
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const minutes = row.getValue("durationMinutes") as number;
      return (
        <span className="font-mono tabular-nums">
          {formatDuration(minutes)}
        </span>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | null;
      return notes ? (
        <span className="max-w-[150px] truncate block text-xs text-muted-foreground">
          {notes}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    meta: { className: "hidden lg:table-cell" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <DeleteEventDialog eventId={row.original.id} />,
  },
];

// --- Component --------------------------------------------------------------

export function DowntimeTable({ data, lines }: DowntimeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedLine, setSelectedLine] = useState<string>("all");

  // Filter data based on date range and line
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Line filter
      if (selectedLine !== "all" && row.lineId !== Number(selectedLine)) {
        return false;
      }

      // Date range filter
      if (dateFrom) {
        const rowDate = startOfDay(parseISO(row.date));
        if (isBefore(rowDate, startOfDay(dateFrom))) {
          return false;
        }
      }
      if (dateTo) {
        const rowDate = startOfDay(parseISO(row.date));
        if (isAfter(rowDate, startOfDay(dateTo))) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedLine, dateFrom, dateTo]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const hasFilters = dateFrom || dateTo || selectedLine !== "all";

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date from */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-[150px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 size-3.5" />
              {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
            />
          </PopoverContent>
        </Popover>

        {/* Date to */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-[150px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 size-3.5" />
              {dateTo ? format(dateTo, "dd MMM yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
            />
          </PopoverContent>
        </Popover>

        {/* Line filter */}
        <Select value={selectedLine} onValueChange={setSelectedLine}>
          <SelectTrigger className="w-[160px]" size="sm">
            <SelectValue placeholder="All lines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lines</SelectItem>
            {lines.map((line) => (
              <SelectItem key={line.id} value={String(line.id)}>
                {line.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
              setSelectedLine("all");
            }}
          >
            <X className="mr-1 size-3" />
            Clear
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredData.length} event{filteredData.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
                  return (
                    <TableHead key={header.id} className={meta?.className}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    const meta = cell.column.columnDef.meta as
                      | { className?: string }
                      | undefined;
                    return (
                      <TableCell key={cell.id} className={meta?.className}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
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
                  No downtime events found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
