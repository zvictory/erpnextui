"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { PurchaseInvoiceForm } from "@/components/purchase-invoices/purchase-invoice-form";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import {
  usePurchaseInvoice,
  useUpdatePurchaseInvoice,
  useSubmitPurchaseInvoice,
  useCancelPurchaseInvoice,
} from "@/hooks/use-purchase-invoices";
import { usePermissions } from "@/hooks/use-permissions";
import type { PurchaseInvoiceFormValues } from "@/lib/schemas/purchase-invoice-schema";
import { RelatedDocuments } from "@/components/shared/related-documents";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

export default function EditPurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const t = useTranslations("invoices");
  const { data: invoice, isLoading } = usePurchaseInvoice(name);
  const { canSubmit, canCancel } = usePermissions();
  const [payOpen, setPayOpen] = useState(false);
  const updateInvoice = useUpdatePurchaseInvoice();
  const submitInvoice = useSubmitPurchaseInvoice();
  const cancelInvoice = useCancelPurchaseInvoice();

  function handleSubmit(data: PurchaseInvoiceFormValues) {
    updateInvoice.mutate(
      { name, data },
      {
        onSuccess: () => toast.success("Draft saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleSubmitDoc() {
    submitInvoice.mutate(name, {
      onSuccess: () => {
        toast.success("Invoice submitted");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleCancelDoc() {
    cancelInvoice.mutate(name, {
      onSuccess: () => {
        toast.success("Invoice cancelled");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <FormPageLayout title="Purchase Invoice" backHref="/purchase-invoices">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!invoice) {
    return (
      <FormPageLayout title="Invoice Not Found" backHref="/purchase-invoices">
        <p className="text-muted-foreground">This invoice does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Purchase Invoice" action="read">
      <FormPageLayout title={invoice.name} backHref="/purchase-invoices">
        <PurchaseInvoiceForm
          defaultValues={invoice}
          onSubmit={handleSubmit}
          isSubmitting={updateInvoice.isPending}
          isEdit
          onSubmitDoc={canSubmit("Purchase Invoice") ? handleSubmitDoc : undefined}
          onCancelDoc={canCancel("Purchase Invoice") ? handleCancelDoc : undefined}
          isSubmittingDoc={submitInvoice.isPending}
          isCancellingDoc={cancelInvoice.isPending}
          onCreateReturn={
            invoice.docstatus === 1 && !invoice.is_return
              ? () =>
                  router.push(
                    `/purchase-invoices/new?return_against=${encodeURIComponent(invoice.name)}`,
                  )
              : undefined
          }
          returnLabel={t("createReturn")}
          onPay={invoice.docstatus === 1 && !invoice.is_return ? () => setPayOpen(true) : undefined}
        />
        {invoice.docstatus === 1 && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{t("staleTotalsTitle")}</div>
              <div className="mt-1">{t("staleTotalsHint")}</div>
            </div>
          </div>
        )}
        <RelatedDocuments doctype="Purchase Invoice" name={name} />
        {invoice.supplier && (
          <PaymentDialog
            open={payOpen}
            onOpenChange={setPayOpen}
            partyType="Supplier"
            partyName={invoice.supplier}
          />
        )}
      </FormPageLayout>
    </PermissionGuard>
  );
}
