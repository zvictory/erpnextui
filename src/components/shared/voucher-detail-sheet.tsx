"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
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
import {
  usePaymentEntry,
  useSubmitPaymentEntry,
  useCancelPaymentEntry,
} from "@/hooks/use-payment-entries";
import {
  useJournalEntry,
  useSubmitJournalEntry,
  useCancelJournalEntry,
} from "@/hooks/use-journal-entries";
import { useSalesOrder } from "@/hooks/use-sales-orders";
import { usePurchaseOrder } from "@/hooks/use-purchase-orders";
import { useDeliveryNote } from "@/hooks/use-delivery-notes";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatInvoiceCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import type { SalesInvoice } from "@/types/sales-invoice";
import type { PurchaseInvoice } from "@/types/purchase-invoice";
import type { PaymentEntry } from "@/types/payment-entry";
import type { JournalEntry } from "@/types/journal-entry";
import type { SalesOrder } from "@/types/sales-order";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { DeliveryNote } from "@/types/delivery-note";

interface VoucherDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherType: string;
  voucherNo: string;
}

const TYPE_TO_HREF: Record<string, (name: string) => string> = {
  "Sales Invoice": (n) => `/sales-invoices/${encodeURIComponent(n)}`,
  "Purchase Invoice": (n) => `/purchase-invoices/${encodeURIComponent(n)}`,
  "Payment Entry": (n) => `/payments/${encodeURIComponent(n)}`,
  "Journal Entry": (n) => `/journal-entries/${encodeURIComponent(n)}`,
  "Sales Order": (n) => `/sales-orders/${encodeURIComponent(n)}`,
  "Purchase Order": (n) => `/purchase-orders/${encodeURIComponent(n)}`,
  "Delivery Note": (n) => `/delivery-notes/${encodeURIComponent(n)}`,
};

export function VoucherDetailSheet({
  open,
  onOpenChange,
  voucherType,
  voucherNo,
}: VoucherDetailSheetProps) {
  const fullPageHref = TYPE_TO_HREF[voucherType]?.(voucherNo);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold pr-8">
            <span className="truncate">{voucherNo}</span>
          </SheetTitle>
          <SheetDescription>{voucherType}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          <VoucherBody
            voucherType={voucherType}
            voucherNo={voucherNo}
            open={open}
            onOpenChange={onOpenChange}
            fullPageHref={fullPageHref}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VoucherBody({
  voucherType,
  voucherNo,
  open,
  onOpenChange,
  fullPageHref,
}: {
  voucherType: string;
  voucherNo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullPageHref: string | undefined;
}) {
  switch (voucherType) {
    case "Sales Invoice":
    case "Purchase Invoice":
      return (
        <InvoiceBody
          voucherType={voucherType}
          voucherNo={voucherNo}
          open={open}
          onOpenChange={onOpenChange}
        />
      );
    case "Payment Entry":
      return <PaymentEntryBody voucherNo={voucherNo} open={open} onOpenChange={onOpenChange} />;
    case "Journal Entry":
      return <JournalEntryBody voucherNo={voucherNo} open={open} onOpenChange={onOpenChange} />;
    case "Sales Order":
      return <SalesOrderBody voucherNo={voucherNo} onOpenChange={onOpenChange} />;
    case "Purchase Order":
      return <PurchaseOrderBody voucherNo={voucherNo} onOpenChange={onOpenChange} />;
    case "Delivery Note":
      return <DeliveryNoteBody voucherNo={voucherNo} onOpenChange={onOpenChange} />;
    default:
      return <UnknownBody fullPageHref={fullPageHref} onOpenChange={onOpenChange} />;
  }
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function SummaryGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 text-sm">
      {items.map((item, i) => (
        <div key={i}>
          <p className="text-muted-foreground text-xs mb-0.5">{item.label}</p>
          <p className="font-medium truncate">{item.value ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

function FooterActions({
  fullPageHref,
  onOpenChange,
  children,
}: {
  fullPageHref: string | undefined;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex gap-2 pt-4 mt-4 border-t">
      {fullPageHref && (
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
      )}
      <div className="flex-1" />
      {children}
    </div>
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
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function ErrorMessage() {
  return <p className="text-sm text-muted-foreground py-4">Could not load this transaction.</p>;
}

function HeaderBadgeRow({ docstatus, status }: { docstatus: 0 | 1 | 2; status?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <DocstatusBadge docstatus={docstatus} status={status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice (Sales / Purchase) — lifted from invoice-detail-dialog.tsx
// ---------------------------------------------------------------------------

function InvoiceBody({
  voucherType,
  voucherNo,
  open,
  onOpenChange,
}: {
  voucherType: string;
  voucherNo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isSales = voucherType === "Sales Invoice";
  const salesQuery = useSalesInvoice(isSales && open ? voucherNo : "");
  const purchaseQuery = usePurchaseInvoice(!isSales && open ? voucherNo : "");
  const query = isSales ? salesQuery : purchaseQuery;
  const invoice = query.data as SalesInvoice | PurchaseInvoice | undefined;

  const { currencySymbol, symbolOnRight, currencyCode } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { canSubmit, canCancel } = usePermissions();
  const submitSales = useSubmitSalesInvoice();
  const submitPurchase = useSubmitPurchaseInvoice();
  const cancelSales = useCancelSalesInvoice();
  const cancelPurchase = useCancelPurchaseInvoice();

  if (query.isLoading) return <LoadingSkeleton />;
  if (!invoice) return <ErrorMessage />;

  const partyName = isSales
    ? (invoice as SalesInvoice).customer
    : (invoice as PurchaseInvoice).supplier;
  const invoiceCurrency = invoice.currency;
  const invCurrencyInfo = invoiceCurrency ? currencyMap?.get(invoiceCurrency) : undefined;
  const fmt = (n: number) =>
    invCurrencyInfo
      ? formatInvoiceCurrency(n, invoiceCurrency, invCurrencyInfo)
      : formatCurrency(n, currencySymbol, symbolOnRight);
  const isMultiCurrency = invoiceCurrency && currencyCode && invoiceCurrency !== currencyCode;

  const fullPageHref = TYPE_TO_HREF[voucherType](voucherNo);
  const showSubmit =
    invoice.docstatus === 0 && canSubmit(voucherType as "Sales Invoice" | "Purchase Invoice");
  const showCancel =
    invoice.docstatus === 1 && canCancel(voucherType as "Sales Invoice" | "Purchase Invoice");

  const handleSubmit = async () => {
    try {
      if (isSales) await submitSales.mutateAsync(voucherNo);
      else await submitPurchase.mutateAsync(voucherNo);
      toast.success(`Submitted ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to submit ${voucherNo}`);
    }
  };

  const handleCancel = async () => {
    try {
      if (isSales) await cancelSales.mutateAsync(voucherNo);
      else await cancelPurchase.mutateAsync(voucherNo);
      toast.success(`Cancelled ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to cancel ${voucherNo}`);
    }
  };

  const submitPending = submitSales.isPending || submitPurchase.isPending;
  const cancelPending = cancelSales.isPending || cancelPurchase.isPending;

  return (
    <div className="flex flex-col h-full">
      <HeaderBadgeRow docstatus={invoice.docstatus} status={invoice.status} />
      <SummaryGrid
        items={[
          { label: isSales ? "Customer" : "Supplier", value: partyName },
          { label: "Posting Date", value: formatDate(invoice.posting_date) },
          { label: "Due Date", value: formatDate(invoice.due_date) },
        ]}
      />
      <Separator className="my-4" />
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
              <TableCell className="font-medium">
                {(item as { item_name?: string }).item_name || item.item_code || "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(item.rate)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(item.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-end gap-1 text-sm pt-3">
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
                invoice.base_grand_total ?? invoice.grand_total,
                currencySymbol,
                symbolOnRight,
              )}
            </span>
          </div>
        )}
      </div>

      <FooterActions fullPageHref={fullPageHref} onOpenChange={onOpenChange}>
        {showCancel && (
          <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelPending}>
            {cancelPending ? "Cancelling..." : "Cancel Invoice"}
          </Button>
        )}
        {showSubmit && (
          <Button size="sm" onClick={handleSubmit} disabled={submitPending}>
            {submitPending ? "Submitting..." : "Submit"}
          </Button>
        )}
      </FooterActions>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Entry
// ---------------------------------------------------------------------------

function PaymentEntryBody({
  voucherNo,
  open,
  onOpenChange,
}: {
  voucherNo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = usePaymentEntry(open ? voucherNo : "");
  const { currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { canSubmit, canCancel } = usePermissions();
  const submit = useSubmitPaymentEntry();
  const cancel = useCancelPaymentEntry();

  if (query.isLoading) return <LoadingSkeleton />;
  const pe = query.data as PaymentEntry | undefined;
  if (!pe) return <ErrorMessage />;

  const paidFromCurrency = pe.paid_from_account_currency;
  const paidToCurrency = pe.paid_to_account_currency;
  const fmtFrom = (n: number) =>
    paidFromCurrency
      ? formatInvoiceCurrency(n, paidFromCurrency, currencyMap?.get(paidFromCurrency))
      : formatCurrency(n, currencySymbol, symbolOnRight);
  const fmtTo = (n: number) =>
    paidToCurrency
      ? formatInvoiceCurrency(n, paidToCurrency, currencyMap?.get(paidToCurrency))
      : formatCurrency(n, currencySymbol, symbolOnRight);

  const fullPageHref = TYPE_TO_HREF["Payment Entry"](voucherNo);
  const showSubmit = pe.docstatus === 0 && canSubmit("Payment Entry");
  const showCancel = pe.docstatus === 1 && canCancel("Payment Entry");

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync(voucherNo);
      toast.success(`Submitted ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to submit ${voucherNo}`);
    }
  };
  const handleCancel = async () => {
    try {
      await cancel.mutateAsync(voucherNo);
      toast.success(`Cancelled ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to cancel ${voucherNo}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <HeaderBadgeRow docstatus={pe.docstatus} status={pe.status} />
      <SummaryGrid
        items={[
          { label: "Type", value: <Badge variant="outline">{pe.payment_type}</Badge> },
          { label: "Posting Date", value: formatDate(pe.posting_date) },
          { label: "Mode", value: pe.mode_of_payment ?? "—" },
        ]}
      />
      <Separator className="my-4" />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">From</p>
          <p className="font-medium truncate">{pe.paid_from}</p>
          <p className="text-base font-semibold tabular-nums mt-1">{fmtFrom(pe.paid_amount)}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">To</p>
          <p className="font-medium truncate">{pe.paid_to}</p>
          <p className="text-base font-semibold tabular-nums mt-1">{fmtTo(pe.received_amount)}</p>
        </div>
      </div>

      {pe.party_name && (
        <div className="mt-3 text-sm">
          <span className="text-muted-foreground">Party: </span>
          <span className="font-medium">{pe.party_name}</span>
        </div>
      )}

      {pe.references?.length > 0 && (
        <>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground mb-2">Allocated against</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pe.references.map((ref, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-xs font-normal mr-1.5">
                      {ref.reference_doctype}
                    </Badge>
                    {ref.reference_name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtTo(ref.allocated_amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {fmtTo(ref.outstanding_amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <FooterActions fullPageHref={fullPageHref} onOpenChange={onOpenChange}>
        {showCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? "Cancelling..." : "Cancel Payment"}
          </Button>
        )}
        {showSubmit && (
          <Button size="sm" onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Submitting..." : "Submit"}
          </Button>
        )}
      </FooterActions>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Journal Entry
// ---------------------------------------------------------------------------

function JournalEntryBody({
  voucherNo,
  open,
  onOpenChange,
}: {
  voucherNo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useJournalEntry(open ? voucherNo : "");
  const { currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { canSubmit, canCancel } = usePermissions();
  const submit = useSubmitJournalEntry();
  const cancel = useCancelJournalEntry();

  if (query.isLoading) return <LoadingSkeleton />;
  const je = query.data as JournalEntry | undefined;
  if (!je) return <ErrorMessage />;

  const fullPageHref = TYPE_TO_HREF["Journal Entry"](voucherNo);
  const showSubmit = je.docstatus === 0 && canSubmit("Journal Entry");
  const showCancel = je.docstatus === 1 && canCancel("Journal Entry");

  const fmtBase = (n: number) => formatCurrency(n, currencySymbol, symbolOnRight);

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync({ name: voucherNo });
      toast.success(`Submitted ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to submit ${voucherNo}`);
    }
  };
  const handleCancel = async () => {
    try {
      await cancel.mutateAsync({ name: voucherNo });
      toast.success(`Cancelled ${voucherNo}`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to cancel ${voucherNo}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <HeaderBadgeRow docstatus={je.docstatus} />
      <SummaryGrid
        items={[
          { label: "Posting Date", value: formatDate(je.posting_date) },
          { label: "Type", value: je.voucher_type },
          { label: "Total", value: fmtBase(je.total_debit) },
        ]}
      />

      {je.user_remark && (
        <p className="mt-3 text-sm text-muted-foreground italic">{je.user_remark}</p>
      )}

      <Separator className="my-4" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Party</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {je.accounts.map((row, i) => {
            const ac = row.account_currency;
            const acInfo = ac ? currencyMap?.get(ac) : undefined;
            const fmt = (n: number) => (ac ? formatInvoiceCurrency(n, ac, acInfo) : fmtBase(n));
            return (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{row.account}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.party ?? "—"}</TableCell>
                <TableCell className="text-right text-red-600 font-medium tabular-nums">
                  {(row.debit_in_account_currency ?? 0) > 0
                    ? fmt(row.debit_in_account_currency ?? 0)
                    : ""}
                </TableCell>
                <TableCell className="text-right text-green-600 font-medium tabular-nums">
                  {(row.credit_in_account_currency ?? 0) > 0
                    ? fmt(row.credit_in_account_currency ?? 0)
                    : ""}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <FooterActions fullPageHref={fullPageHref} onOpenChange={onOpenChange}>
        {showCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? "Cancelling..." : "Cancel Entry"}
          </Button>
        )}
        {showSubmit && (
          <Button size="sm" onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Submitting..." : "Submit"}
          </Button>
        )}
      </FooterActions>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sales Order
// ---------------------------------------------------------------------------

function SalesOrderBody({
  voucherNo,
  onOpenChange,
}: {
  voucherNo: string;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useSalesOrder(voucherNo);
  const { currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();

  if (query.isLoading) return <LoadingSkeleton />;
  const so = query.data as SalesOrder | undefined;
  if (!so) return <ErrorMessage />;

  const cur = so.currency;
  const curInfo = cur ? currencyMap?.get(cur) : undefined;
  const fmt = (n: number) =>
    cur ? formatInvoiceCurrency(n, cur, curInfo) : formatCurrency(n, currencySymbol, symbolOnRight);
  const fullPageHref = TYPE_TO_HREF["Sales Order"](voucherNo);

  return (
    <div className="flex flex-col h-full">
      <HeaderBadgeRow docstatus={so.docstatus} status={so.status} />
      <SummaryGrid
        items={[
          { label: "Customer", value: so.customer_name ?? so.customer },
          { label: "Order Date", value: formatDate(so.transaction_date) },
          { label: "Delivery", value: formatDate(so.delivery_date) },
        ]}
      />
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>Billed: {Math.round(so.per_billed)}%</span>
        <span>Delivered: {Math.round(so.per_delivered)}%</span>
      </div>

      <Separator className="my-4" />

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
          {so.items.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium text-sm">
                {item.item_name || item.item_code}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(item.rate)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(item.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-end gap-1 text-sm pt-3">
        <div className="flex gap-8">
          <span className="text-muted-foreground">Grand Total</span>
          <span className="font-bold tabular-nums text-base">{fmt(so.grand_total)}</span>
        </div>
      </div>

      <FooterActions fullPageHref={fullPageHref} onOpenChange={onOpenChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Purchase Order
// ---------------------------------------------------------------------------

function PurchaseOrderBody({
  voucherNo,
  onOpenChange,
}: {
  voucherNo: string;
  onOpenChange: (open: boolean) => void;
}) {
  const query = usePurchaseOrder(voucherNo);
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  if (query.isLoading) return <LoadingSkeleton />;
  const po = query.data as PurchaseOrder | undefined;
  if (!po) return <ErrorMessage />;

  const fmt = (n: number) => formatCurrency(n, currencySymbol, symbolOnRight);
  const fullPageHref = TYPE_TO_HREF["Purchase Order"](voucherNo);

  return (
    <div className="flex flex-col h-full">
      <HeaderBadgeRow docstatus={po.docstatus} status={po.status} />
      <SummaryGrid
        items={[
          { label: "Supplier", value: po.supplier },
          { label: "Order Date", value: formatDate(po.transaction_date) },
          { label: "Status", value: po.status },
        ]}
      />
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>Billed: {Math.round(po.per_billed)}%</span>
        <span>Received: {Math.round(po.per_received)}%</span>
      </div>

      <Separator className="my-4" />

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
          {po.items.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium text-sm">{item.item_code}</TableCell>
              <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(item.rate)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(item.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-end gap-1 text-sm pt-3">
        <div className="flex gap-8">
          <span className="text-muted-foreground">Grand Total</span>
          <span className="font-bold tabular-nums text-base">{fmt(po.grand_total)}</span>
        </div>
      </div>

      <FooterActions fullPageHref={fullPageHref} onOpenChange={onOpenChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery Note
// ---------------------------------------------------------------------------

function DeliveryNoteBody({
  voucherNo,
  onOpenChange,
}: {
  voucherNo: string;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useDeliveryNote(voucherNo);

  if (query.isLoading) return <LoadingSkeleton />;
  const dn = query.data as DeliveryNote | undefined;
  if (!dn) return <ErrorMessage />;

  const fullPageHref = TYPE_TO_HREF["Delivery Note"](voucherNo);

  return (
    <div className="flex flex-col h-full">
      <HeaderBadgeRow docstatus={dn.docstatus} status={dn.status} />
      <SummaryGrid
        items={[
          { label: "Customer", value: dn.customer },
          { label: "Posting Date", value: formatDate(dn.posting_date) },
          { label: "Status", value: dn.status },
        ]}
      />

      <Separator className="my-4" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Warehouse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dn.items.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium text-sm">{item.item_code}</TableCell>
              <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {item.warehouse ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <FooterActions fullPageHref={fullPageHref} onOpenChange={onOpenChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unknown / fallback
// ---------------------------------------------------------------------------

function UnknownBody({
  fullPageHref,
  onOpenChange,
}: {
  fullPageHref: string | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-sm text-muted-foreground py-4">
        This voucher type does not have an inline preview yet.
      </p>
      <FooterActions fullPageHref={fullPageHref} onOpenChange={onOpenChange} />
    </div>
  );
}
