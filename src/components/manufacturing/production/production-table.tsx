"use client";

import { useState, useMemo } from "react";
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
import { CalendarIcon, X } from "lucide-react";

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
import type { ProductionRunRow } from "./columns";

// --- Types ------------------------------------------------------------------

interface LineOption {
  id: number;
  name: string;
}

interface ProductionTableProps {
  columns: ColumnDef<ProductionRunRow, unknown>[];
  data: ProductionRunRow[];
  lines: LineOption[];
}

// --- Component --------------------------------------------------------------

export function ProductionTable({
  columns,
  data,
  lines,
}: ProductionTableProps) {
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
            <Button variant="outline" size="sm" className="w-[150px] justify-start text-left font-normal">
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
            <Button variant="outline" size="sm" className="w-[150px] justify-start text-left font-normal">
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
          {filteredData.length} run{filteredData.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={meta?.className}
                    >
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
                      <TableCell
                        key={cell.id}
                        className={meta?.className}
                      >
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
                  No production runs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
