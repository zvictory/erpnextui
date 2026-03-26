"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLine } from "@/actions/lines";

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
} from "@/components/ui/alert-dialog";
import { LineForm } from "./line-form";

// ─── Types ──────────────────────────────────────────────────────────

export interface LineRow {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number | null;
}

interface LinesTableProps {
  data: LineRow[];
}

// ─── Component ──────────────────────────────────────────────────────

export function LinesTable({ data }: LinesTableProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<LineRow | undefined>(
    undefined
  );
  const [deleteTarget, setDeleteTarget] = useState<LineRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // ─── Columns ────────────────────────────────────────────────────

  const columns: ColumnDef<LineRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const val = row.getValue("description") as string | null;
          return val ? (
            <span>{val}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "sortOrder",
        header: "Sort Order",
        cell: ({ row }) => {
          const val = row.getValue("sortOrder") as number | null;
          return val != null ? (
            <span className="font-mono tabular-nums">{val}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const line = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setEditingLine(line);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-3" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setDeleteTarget(line)}
              >
                <Trash2 className="size-3 text-destructive" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteLine(deleteTarget.id);
      if (result.success) {
        toast.success(`Line "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete line.");
      }
    });
  }

  function handleAddNew() {
    setEditingLine(undefined);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) {
      setEditingLine(undefined);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {data.length} line{data.length !== 1 ? "s" : ""}
        </span>
        <Button size="sm" onClick={handleAddNew}>
          <Plus className="mr-1 size-3.5" />
          Add Line
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No production lines found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <LineForm
        key={editingLine?.id ?? "new"}
        open={formOpen}
        onOpenChange={handleFormClose}
        initialData={editingLine}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete production line?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete line{" "}
              <strong>{deleteTarget?.name}</strong>. This action cannot be
              undone.
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
    </div>
  );
}
