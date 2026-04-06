"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { SalesInvoiceForm } from "@/components/sales-invoices/sales-invoice-form";
import { WorkflowTimeline } from "@/components/shared/workflow-timeline";
import { DynamicWorkflowActions } from "@/components/shared/dynamic-workflow-actions";
import { useActiveWorkflow } from "@/hooks/use-document-workflow";
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
import { useState } from "react";
import { mapSalesInvoiceToYukXati } from "@/lib/utils/invoice-to-yukxati";
import { YukXatiPreview } from "@/components/print/yuk-xati-preview";

export default function EditSalesInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const t = useTranslations("invoices");
  const { data: invoice, isLoading, refetch } = useSalesInvoice(name);
  const { canSubmit, canCancel } = usePermissions();
  const updateInvoice = useUpdateSalesInvoice();
  const submitInvoice = useSubmitSalesInvoice();
  const cancelInvoice = useCancelSalesInvoice();

  const workflowState = (invoice as Record<string, unknown>)?.workflow_state as string | undefined;
  const { hasWorkflow } = useActiveWorkflow("Sales Invoice");
  const [yukXatiOpen, setYukXatiOpen] = useState(false);

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
        {/* Workflow timeline + actions (only show if workflow is active) */}
        {workflowState && (
          <div className="space-y-3 mb-4">
            <WorkflowTimeline currentState={workflowState} />
            {hasWorkflow && (
              <DynamicWorkflowActions
                doctype="Sales Invoice"
                docname={invoice.name}
                currentState={workflowState}
                onTransition={() => refetch()}
                invalidateKeys={[["salesInvoices"]]}
              />
            )}
            <Separator />
          </div>
        )}

        <SalesInvoiceForm
          defaultValues={invoice}
          onSubmit={handleSubmit}
          isSubmitting={updateInvoice.isPending}
          isEdit
          onSubmitDoc={canSubmit("Sales Invoice") && !hasWorkflow ? handleSubmitDoc : undefined}
          onCancelDoc={canCancel("Sales Invoice") && !hasWorkflow ? handleCancelDoc : undefined}
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
          onPrintReceipt={() =>
            window.open(`/sales-invoices/${encodeURIComponent(invoice.name)}/print`, "_blank")
          }
          onPrintYukXati={() => setYukXatiOpen(true)}
          onReceivePayment={() =>
            router.push(
              `/payments/receive?customer=${encodeURIComponent(invoice.customer)}&amount=${invoice.grand_total}`,
            )
          }
        />
        <RelatedDocuments doctype="Sales Invoice" name={name} />

        {invoice && (
          <YukXatiPreview
            open={yukXatiOpen}
            onOpenChange={setYukXatiOpen}
            data={mapSalesInvoiceToYukXati(invoice)}
          />
        )}
      </FormPageLayout>
    </PermissionGuard>
  );
}
