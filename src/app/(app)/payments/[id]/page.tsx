"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  usePaymentEntry,
  useSubmitPaymentEntry,
  useCancelPaymentEntry,
  useDeletePaymentEntry,
  useAutoAllocatePaymentEntry,
  NO_OUTSTANDING_ERROR,
} from "@/hooks/use-payment-entries";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { formatDate, formatNumber, formatInvoiceCurrency } from "@/lib/formatters";

export default function PaymentEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const t = useTranslations("payments");
  const { data: currencyMap } = useCurrencyMap();
  const { data: pe, isLoading } = usePaymentEntry(name);
  const submitMutation = useSubmitPaymentEntry();
  const cancelMutation = useCancelPaymentEntry();
  const deleteMutation = useDeletePaymentEntry();
  const autoAllocateMutation = useAutoAllocatePaymentEntry();
  const [confirmAction, setConfirmAction] = useState<
    "submit" | "cancel" | "delete" | "autoAllocate" | null
  >(null);

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction === "submit") {
      submitMutation.mutate(name, {
        onSuccess: () => {
          toast.success(t("submitted"));
          setConfirmAction(null);
          router.refresh();
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (confirmAction === "cancel") {
      cancelMutation.mutate(name, {
        onSuccess: () => {
          toast.success(t("cancelled"));
          setConfirmAction(null);
          router.refresh();
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (confirmAction === "delete") {
      deleteMutation.mutate(name, {
        onSuccess: () => {
          toast.success(t("deleted"));
          setConfirmAction(null);
          router.push("/payments");
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (confirmAction === "autoAllocate") {
      autoAllocateMutation.mutate(name, {
        onSuccess: (amended) => {
          toast.success(t("autoAllocateSuccess"));
          setConfirmAction(null);
          const amendedName = (amended as { name?: string })?.name;
          if (amendedName && amendedName !== name) {
            router.push(`/payments/${encodeURIComponent(amendedName)}`);
          } else {
            router.refresh();
          }
        },
        onError: (err) => {
          setConfirmAction(null);
          if (err.message === NO_OUTSTANDING_ERROR) {
            toast.error(t("autoAllocateNoOutstanding"));
          } else {
            toast.error(err.message);
          }
        },
      });
    }
  }

  const confirmConfig = {
    submit: {
      title: t("submit"),
      description: `Submit "${name}"? This will post the payment to the ledger.`,
      label: t("submit"),
      variant: "default" as const,
    },
    cancel: {
      title: t("cancelPayment"),
      description: t("cancelPaymentDesc"),
      label: t("cancelPayment"),
      variant: "destructive" as const,
    },
    delete: {
      title: t("deletePayment"),
      description: `Delete "${name}"? This action cannot be undone.`,
      label: t("deletePayment"),
      variant: "destructive" as const,
    },
    autoAllocate: {
      title: t("autoAllocate"),
      description: t("autoAllocateConfirm"),
      label: t("autoAllocate"),
      variant: "default" as const,
    },
  };

  const config = confirmAction ? confirmConfig[confirmAction] : null;

  if (isLoading) {
    return (
      <FormPageLayout title={t("paymentEntry")} backHref="/payments">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!pe) {
    return (
      <FormPageLayout title={t("notFound")} backHref="/payments">
        <p className="text-muted-foreground">This payment entry does not exist.</p>
      </FormPageLayout>
    );
  }

  const amendHref =
    pe.payment_type === "Receive"
      ? `/payments/receive?amend_from=${encodeURIComponent(pe.name)}`
      : `/payments/pay?amend_from=${encodeURIComponent(pe.name)}`;

  return (
    <FormPageLayout title={pe.name} backHref="/payments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <DocstatusBadge docstatus={pe.docstatus} status={pe.status} />
          <Badge variant="outline">{pe.payment_type}</Badge>
        </div>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("party")} value={pe.party_name || pe.party} />
          <Field label={t("partyType")} value={pe.party_type} />
          <Field label={t("date")} value={formatDate(pe.posting_date)} />
          <Field
            label={t("paidAmount")}
            value={(() => {
              const cur =
                pe.payment_type === "Receive"
                  ? pe.paid_to_account_currency
                  : pe.paid_from_account_currency;
              return formatInvoiceCurrency(pe.paid_amount, cur ?? "", currencyMap?.get(cur ?? ""));
            })()}
          />
          <Field label={t("paidFrom")} value={pe.paid_from} />
          <Field label={t("paidTo")} value={pe.paid_to} />
          {pe.mode_of_payment && <Field label={t("modeOfPayment")} value={pe.mode_of_payment} />}
          {pe.reference_no && <Field label={t("referenceNo")} value={pe.reference_no} />}
        </div>

        {pe.remarks && (
          <div className="text-sm text-muted-foreground rounded-md border p-3">{pe.remarks}</div>
        )}

        {/* Allocated invoices */}
        {pe.references && pe.references.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("allocatedInvoices")}</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoiceNo")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead className="text-right">{t("totalAmount")}</TableHead>
                    <TableHead className="text-right">{t("allocated")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pe.references.map((ref) => (
                    <TableRow key={ref.reference_name}>
                      <TableCell className="font-mono text-xs">{ref.reference_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ref.reference_doctype}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(ref.total_amount, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatNumber(ref.allocated_amount, 2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {/* Draft: Submit + Delete */}
          {pe.docstatus === 0 && (
            <>
              <Button onClick={() => setConfirmAction("submit")}>{t("submit")}</Button>
              <Button variant="destructive" onClick={() => setConfirmAction("delete")}>
                {t("deletePayment")}
              </Button>
            </>
          )}
          {/* Submitted: Auto-Allocate (if unallocated) + Cancel */}
          {pe.docstatus === 1 && (
            <>
              {typeof pe.unallocated_amount === "number" && pe.unallocated_amount > 0.01 && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction("autoAllocate")}
                  disabled={autoAllocateMutation.isPending}
                >
                  <Wand2 className="h-4 w-4 mr-1.5" />
                  {t("autoAllocate")}
                </Button>
              )}
              <Button variant="destructive" onClick={() => setConfirmAction("cancel")}>
                {t("cancelPayment")}
              </Button>
            </>
          )}
          {/* Cancelled: Amend + Delete */}
          {pe.docstatus === 2 && (
            <>
              <Button variant="outline" asChild>
                <a href={amendHref}>
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  {t("amend")}
                </a>
              </Button>
              <Button variant="destructive" onClick={() => setConfirmAction("delete")}>
                {t("deletePayment")}
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={config?.title ?? ""}
        description={config?.description ?? ""}
        confirmLabel={config?.label}
        variant={config?.variant}
        onConfirm={handleConfirm}
        loading={
          submitMutation.isPending ||
          cancelMutation.isPending ||
          deleteMutation.isPending ||
          autoAllocateMutation.isPending
        }
      />
    </FormPageLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
