"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { SalesInvoiceForm } from "@/components/sales-invoices/sales-invoice-form";
import {
  useSalesInvoice,
  useUpdateSalesInvoice,
  useSubmitSalesInvoice,
  useCancelSalesInvoice,
} from "@/hooks/use-sales-invoices";
import { usePermissions } from "@/hooks/use-permissions";
import type { SalesInvoiceSubmitValues } from "@/lib/schemas/sales-invoice-schema";
import { RelatedDocuments } from "@/components/shared/related-documents";
import { useTranslations } from "next-intl";

export default function EditSalesInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const t = useTranslations("invoices");
  const { data: invoice, isLoading } = useSalesInvoice(name);
  const { canSubmit, canCancel } = usePermissions();
  const updateInvoice = useUpdateSalesInvoice();
  const submitInvoice = useSubmitSalesInvoice();
  const cancelInvoice = useCancelSalesInvoice();

  function handleSubmit(data: SalesInvoiceSubmitValues) {
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
      <FormPageLayout title="Sales Invoice" backHref="/sales-invoices">
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
      <FormPageLayout title="Invoice Not Found" backHref="/sales-invoices">
        <p className="text-muted-foreground">This invoice does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Sales Invoice" action="read">
      <FormPageLayout title={invoice.name} backHref="/sales-invoices">
        <SalesInvoiceForm
          defaultValues={invoice}
          onSubmit={handleSubmit}
          isSubmitting={updateInvoice.isPending}
          isEdit
          onSubmitDoc={canSubmit("Sales Invoice") ? handleSubmitDoc : undefined}
          onCancelDoc={canCancel("Sales Invoice") ? handleCancelDoc : undefined}
          isSubmittingDoc={submitInvoice.isPending}
          isCancellingDoc={cancelInvoice.isPending}
          onCreateReturn={
            invoice.docstatus === 1 && !invoice.is_return
              ? () =>
                  router.push(
                    `/sales-invoices/new?return_against=${encodeURIComponent(invoice.name)}`,
                  )
              : undefined
          }
          returnLabel={t("createReturn")}
        />
        <RelatedDocuments doctype="Sales Invoice" name={name} />
      </FormPageLayout>
    </PermissionGuard>
  );
}
