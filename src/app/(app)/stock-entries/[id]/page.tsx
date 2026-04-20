"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DynamicWorkflowActions } from "@/components/shared/dynamic-workflow-actions";
import { useActiveWorkflow } from "@/hooks/use-document-workflow";
import { useStockEntry, useCancelStockEntry, useDeleteStockEntry } from "@/hooks/use-stock-entries";
import { formatDate, formatNumber } from "@/lib/formatters";
import { exportToExcel } from "@/lib/utils/export-excel";
import { useState } from "react";

export default function StockEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const { data: entry, isLoading, refetch } = useStockEntry(name);
  const cancelEntry = useCancelStockEntry();
  const deleteEntry = useDeleteStockEntry();
  const { hasWorkflow } = useActiveWorkflow("Stock Entry");
  const workflowState = (entry as Record<string, unknown>)?.workflow_state as string | undefined;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/stock-entries")}>
          <ArrowLeft className="mr-2 size-4" /> Stock Entries
        </Button>
        <p className="text-muted-foreground">Stock entry not found.</p>
      </div>
    );
  }

  const items = entry.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-3"
            onClick={() => router.push("/stock-entries")}
          >
            <ArrowLeft className="mr-1 size-4" /> Stock Entries
          </Button>
          <h1 className="text-2xl font-bold">{entry.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{entry.stock_entry_type}</Badge>
            <DocstatusBadge docstatus={entry.docstatus} />
            {hasWorkflow && workflowState && <Badge variant="secondary">{workflowState}</Badge>}
            <span className="text-sm text-muted-foreground">{formatDate(entry.posting_date)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToExcel(
                items.map((item) => ({
                  item_code: item.item_code,
                  item_name: item.item_name || "",
                  qty: item.qty,
                  uom: item.uom || "",
                  s_warehouse: item.s_warehouse || "",
                  t_warehouse: item.t_warehouse || "",
                  basic_rate: item.basic_rate,
                  amount: item.amount,
                })),
                [
                  { header: "Item Code", key: "item_code", width: 20 },
                  { header: "Item Name", key: "item_name", width: 30 },
                  { header: "Qty", key: "qty", width: 10 },
                  { header: "UOM", key: "uom", width: 10 },
                  { header: "Source Warehouse", key: "s_warehouse", width: 25 },
                  { header: "Target Warehouse", key: "t_warehouse", width: 25 },
                  { header: "Rate", key: "basic_rate", width: 15 },
                  { header: "Amount", key: "amount", width: 15 },
                ],
                entry.name,
                "Items",
              )
            }
          >
            <Download className="mr-1 size-4" />
            Excel
          </Button>
          {hasWorkflow && workflowState && entry.docstatus < 2 ? (
            <DynamicWorkflowActions
              doctype="Stock Entry"
              docname={entry.name}
              currentState={workflowState}
              onTransition={() => refetch()}
              invalidateKeys={[["stockEntries"]]}
            />
          ) : (
            <>
              {entry.docstatus === 1 && (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                  Cancel
                </Button>
              )}
              {entry.docstatus === 2 && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Warehouses */}
      <div className="grid gap-4 sm:grid-cols-2">
        {entry.from_warehouse && (
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">From Warehouse</p>
            <p className="font-medium">{entry.from_warehouse}</p>
          </div>
        )}
        {entry.to_warehouse && (
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">To Warehouse</p>
            <p className="font-medium">{entry.to_warehouse}</p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Source Warehouse</TableHead>
              <TableHead>Target Warehouse</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground h-20">
                  No items
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                  <TableCell>{item.item_name || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.qty)}
                  </TableCell>
                  <TableCell>{item.uom || "—"}</TableCell>
                  <TableCell className="text-sm">{item.s_warehouse || "—"}</TableCell>
                  <TableCell className="text-sm">{item.t_warehouse || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.basic_rate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatNumber(item.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      <div className="flex justify-end">
        <div className="text-right">
          <span className="text-muted-foreground mr-4">Total</span>
          <span className="text-lg font-bold tabular-nums">{formatNumber(entry.total_amount)}</span>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Stock Entry"
        description={`Cancel "${name}"? This will reverse all stock movements.`}
        confirmLabel="Cancel Entry"
        variant="destructive"
        loading={cancelEntry.isPending}
        onConfirm={() =>
          cancelEntry.mutate(name, {
            onSuccess: () => {
              toast.success("Stock entry cancelled");
              setCancelOpen(false);
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Stock Entry"
        description={`Delete "${name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteEntry.isPending}
        onConfirm={() =>
          deleteEntry.mutate(name, {
            onSuccess: () => {
              toast.success("Stock entry deleted");
              router.push("/stock-entries");
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </div>
  );
}
