"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import { ExternalLink } from "lucide-react";
import {
  useSalesInvoice,
  useSubmitSalesInvoice,
  useCancelSalesInvoice,
} from "@/hooks/use-sales-invoices";
import {
  usePurchaseInvoice,
  useSubmitPurchaseInvoice,
  useCancelPurchaseInvoice,
} from "@/hooks/use-purchase-invoices";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatInvoiceCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherType: "Sales Invoice" | "Purchase Invoice";
  voucherNo: string;
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  voucherType,
  voucherNo,
}: InvoiceDetailDialogProps) {
  const isSales = voucherType === "Sales Invoice";

  const salesQuery = useSalesInvoice(isSales && open ? voucherNo : "");
  const purchaseQuery = usePurchaseInvoice(!isSales && open ? voucherNo : "");

  const query = isSales ? salesQuery : purchaseQuery;
  const invoice = query.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {invoice ? (
              <>
                <DocstatusBadge docstatus={invoice.docstatus} status={invoice.status} />
                {voucherNo}
              </>
            ) : (
              voucherNo
            )}
          </DialogTitle>
          <DialogDescription>{voucherType} details</DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <LoadingSkeleton />
        ) : !invoice ? (
          <p className="text-sm text-muted-foreground py-4">Could not load invoice.</p>
        ) : (
          <InvoiceBody
            voucherType={voucherType}
            voucherNo={voucherNo}
            invoice={invoice}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceBody({
  voucherType,
  voucherNo,
  invoice,
  onOpenChange,
}: {
  voucherType: "Sales Invoice" | "Purchase Invoice";
  voucherNo: string;
  invoice: {
    docstatus: 0 | 1 | 2;
    customer?: string;
    supplier?: string;
    posting_date: string;
    due_date: string;
    items: { item_code?: string; description?: string; qty: number; rate: number; amount: number }[];
    total: number;
    grand_total: number;
    status: string;
  };
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { currencySymbol, symbolOnRight, currencyCode } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { canSubmit, canCancel } = usePermissions();

  const isSales = voucherType === "Sales Invoice";
  const submitSales = useSubmitSalesInvoice();
  const submitPurchase = useSubmitPurchaseInvoice();
  const cancelSales = useCancelSalesInvoice();
  const cancelPurchase = useCancelPurchaseInvoice();

  const partyName = isSales
    ? (invoice as { customer?: string }).customer
    : (invoice as { supplier?: string }).supplier;

  const invoiceCurrency = (invoice as Record<string, unknown>).currency as string | undefined;
  const invCurrencyInfo = invoiceCurrency ? currencyMap?.get(invoiceCurrency) : undefined;
  const fmt = (n: number) =>
    invCurrencyInfo
      ? formatInvoiceCurrency(n, invoiceCurrency, invCurrencyInfo)
      : formatCurrency(n, currencySymbol, symbolOnRight);
  const isMultiCurrency = invoiceCurrency && currencyCode && invoiceCurrency !== currencyCode;

  const fullPageHref = isSales
    ? `/sales-invoices/${encodeURIComponent(voucherNo)}`
    : `/purchase-invoices/${encodeURIComponent(voucherNo)}`;

  const showSubmit = invoice.docstatus === 0 && canSubmit(voucherType);
  const showCancel = invoice.docstatus === 1 && canCancel(voucherType);

  const handleSubmit = async () => {
    try {
      if (isSales) {
        await submitSales.mutateAsync(voucherNo);
      } else {
        await submitPurchase.mutateAsync(voucherNo);
      }
      toast.success(`Submitted ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to submit ${voucherNo}`);
    }
  };

  const handleCancel = async () => {
    try {
      if (isSales) {
        await cancelSales.mutateAsync(voucherNo);
      } else {
        await cancelPurchase.mutateAsync(voucherNo);
      }
      toast.success(`Cancelled ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to cancel ${voucherNo}`);
    }
  };

  return (
    <>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">
            {isSales ? "Customer" : "Supplier"}
          </p>
          <p className="font-medium truncate">{partyName ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Posting Date</p>
          <p className="font-medium">{formatDate(invoice.posting_date)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Due Date</p>
          <p className="font-medium">{formatDate(invoice.due_date)}</p>
        </div>
      </div>

      <Separator />

      {/* Items table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{item.item_code || item.description || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(item.rate)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end gap-1 text-sm pt-2">
        <div className="flex gap-8">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium tabular-nums">{fmt(invoice.total)}</span>
        </div>
        <div className="flex gap-8">
          <span className="text-muted-foreground">Grand Total</span>
          <span className="font-bold tabular-nums text-base">{fmt(invoice.grand_total)}</span>
        </div>
        {isMultiCurrency && (
          <div className="flex gap-8">
            <span className="text-muted-foreground">Total in {currencyCode}</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(
                ((invoice as Record<string, unknown>).base_grand_total as number) ??
                  invoice.grand_total,
                currencySymbol,
                symbolOnRight,
              )}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onOpenChange(false);
            router.push(fullPageHref);
          }}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open Full Page
        </Button>
        <div className="flex-1" />
        {showCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancelSales.isPending || cancelPurchase.isPending}
          >
            {cancelSales.isPending || cancelPurchase.isPending ? "Cancelling..." : "Cancel Invoice"}
          </Button>
        )}
        {showSubmit && (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitSales.isPending || submitPurchase.isPending}
          >
            {submitSales.isPending || submitPurchase.isPending ? "Submitting..." : "Submit"}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <Separator />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
