"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortKey?: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

export interface BulkAction<T> {
  label: string;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
  onAction: (selectedRows: T[]) => void;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sort: string;
  onSortChange: (sort: string) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  toolbar?: React.ReactNode;
  filterBar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  bulkActions?: BulkAction<T>[];
  rowKey?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  search,
  onSearchChange,
  searchPlaceholder,
  sort,
  onSortChange,
  page,
  pageSize,
  totalCount,
  onNextPage,
  onPrevPage,
  toolbar,
  filterBar,
  onRowClick,
  bulkActions,
  rowKey,
}: DataTableProps<T>) {
  const t = useTranslations("common");
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const hasNext = page * pageSize < totalCount;
  const hasPrev = page > 1;

  const hasBulk = bulkActions && bulkActions.length > 0 && rowKey;
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!rowKey) return;
    setSelectedKeys((prev) => {
      if (prev.size === data.length) return new Set();
      return new Set(data.map(rowKey));
    });
  }, [data, rowKey]);

  const selectedRows = hasBulk ? data.filter((row) => selectedKeys.has(rowKey!(row))) : [];

  function handleSort(sortKey: string) {
    const currentField = sort.replace(/ (asc|desc)$/, "");
    const currentDir = sort.endsWith(" desc") ? "desc" : "asc";
    if (currentField === sortKey) {
      onSortChange(`${sortKey} ${currentDir === "asc" ? "desc" : "asc"}`);
    } else {
      onSortChange(`${sortKey} asc`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder ?? t("search")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {toolbar}
      </div>

      {filterBar && <div>{filterBar}</div>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {hasBulk && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={data.length > 0 && selectedKeys.size === data.length}
                    onCheckedChange={toggleAll}
                    aria-label={t("selectAll")}
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.sortKey ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort(col.sortKey!)}
                    >
                      {col.header}
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {hasBulk && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (hasBulk ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("noResultsFound")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => {
                const key = hasBulk ? rowKey!(row) : String(i);
                const isSelected = hasBulk && selectedKeys.has(key);
                return (
                  <TableRow
                    key={key}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() => onRowClick?.(row)}
                  >
                    {hasBulk && (
                      <TableCell
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(key);
                        }}
                      >
                        <Checkbox checked={isSelected} aria-label={`Select ${key}`} />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk action bar */}
      {hasBulk && selectedRows.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedRows.length} {t("selected")}
          </span>
          {bulkActions!.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "default"}
              size="sm"
              onClick={() => action.onAction(selectedRows)}
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())}>
            {t("clear")}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount > 0
            ? `${t("showing")} ${start}-${end} ${t("of")} ${totalCount}`
            : t("noResults")}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onPrevPage} disabled={!hasPrev}>
            {t("previous")}
          </Button>
          <Button variant="outline" size="sm" onClick={onNextPage} disabled={!hasNext}>
            {t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
