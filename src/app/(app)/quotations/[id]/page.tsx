"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { QuotationForm } from "@/components/quotations/quotation-form";
import {
  useQuotation,
  useUpdateQuotation,
  useSubmitQuotation,
  useCancelQuotation,
} from "@/hooks/use-quotations";
import { usePermissions } from "@/hooks/use-permissions";
import type { QuotationFormValues } from "@/lib/schemas/quotation-schema";

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const { data: quotation, isLoading } = useQuotation(name);
  const { canSubmit, canCancel } = usePermissions();
  const updateQuotation = useUpdateQuotation();
  const submitQuotation = useSubmitQuotation();
  const cancelQuotation = useCancelQuotation();

  function handleSubmit(data: QuotationFormValues) {
    updateQuotation.mutate(
      { name, data },
      {
        onSuccess: () => toast.success("Draft saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleSubmitDoc() {
    submitQuotation.mutate(name, {
      onSuccess: () => {
        toast.success("Quotation submitted");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleCancelDoc() {
    cancelQuotation.mutate(name, {
      onSuccess: () => {
        toast.success("Quotation cancelled");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <FormPageLayout title="Quotation" backHref="/quotations">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!quotation) {
    return (
      <FormPageLayout title="Quotation Not Found" backHref="/quotations">
        <p className="text-muted-foreground">This quotation does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Quotation" action="read">
      <FormPageLayout title={quotation.name} backHref="/quotations">
        <QuotationForm
          defaultValues={quotation}
          onSubmit={handleSubmit}
          isSubmitting={updateQuotation.isPending}
          isEdit
          onSubmitDoc={canSubmit("Quotation") ? handleSubmitDoc : undefined}
          onCancelDoc={canCancel("Quotation") ? handleCancelDoc : undefined}
          isSubmittingDoc={submitQuotation.isPending}
          isCancellingDoc={cancelQuotation.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
