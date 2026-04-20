"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteProduct } from "@/actions/products";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ProductForm } from "./product-form";
import { formatNumber } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────

export interface ProductRow {
  id: number;
  code: string;
  name: string;
  unit: string | null;
  nominalSpeed: number;
  weightKg: number | null;
  piecesPerBox: number | null;
}

interface ProductsTableProps {
  data: ProductRow[];
}

// ─── Component ──────────────────────────────────────────────────────

export function ProductsTable({ data }: ProductsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Client-side search filter
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (row) => row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q),
    );
  }, [data, search]);

  // ─── Columns ────────────────────────────────────────────────────

  const columns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Code
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-mono font-medium">{row.getValue("code")}</span>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="max-w-[250px] truncate block">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => row.getValue("unit") ?? "-",
      },
      {
        accessorKey: "nominalSpeed",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Speed (pcs/hr)
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {formatNumber(row.getValue("nominalSpeed") as number)}
          </span>
        ),
      },
      {
        accessorKey: "weightKg",
        header: "Weight (kg)",
        cell: ({ row }) => {
          const val = row.getValue("weightKg") as number | null;
          return val != null ? (
            <span className="font-mono tabular-nums">{val}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
        meta: { className: "hidden lg:table-cell" },
      },
      {
        accessorKey: "piecesPerBox",
        header: "Pcs/Box",
        cell: ({ row }) => {
          const val = row.getValue("piecesPerBox") as number | null;
          return val != null ? (
            <span className="font-mono tabular-nums">{val}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setEditingProduct(product);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-3" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(product)}>
                <Trash2 className="size-3 text-destructive" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProduct(deleteTarget.id);
      if (result.success) {
        toast.success(`Product "${deleteTarget.code}" deleted.`);
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete product.");
      }
    });
  }

  function handleAddNew() {
    setEditingProduct(undefined);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) {
      setEditingProduct(undefined);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar + Add button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute right-1.5 top-1.5"
              onClick={() => setSearch("")}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          {filteredData.length} product{filteredData.length !== 1 ? "s" : ""}
        </span>

        <Button size="sm" className="ml-auto" onClick={handleAddNew}>
          <Plus className="mr-1 size-3.5" />
          Add Product
        </Button>
      </div>

      {/* Table */}
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
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <ProductForm
        key={editingProduct?.id ?? "new"}
        open={formOpen}
        onOpenChange={handleFormClose}
        initialData={editingProduct}
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
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete product <strong>{deleteTarget?.code}</strong> (
              {deleteTarget?.name}). This action cannot be undone.
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
    </div>
  );
}
