"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { DeliveryNoteForm } from "@/components/delivery-notes/delivery-note-form";
import {
  useDeliveryNote,
  useUpdateDeliveryNote,
  useSubmitDeliveryNote,
  useCancelDeliveryNote,
} from "@/hooks/use-delivery-notes";
import { usePermissions } from "@/hooks/use-permissions";
import type { DeliveryNoteFormValues } from "@/lib/schemas/delivery-note-schema";

export default function EditDeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const { data: note, isLoading } = useDeliveryNote(name);
  const { canSubmit, canCancel } = usePermissions();
  const updateNote = useUpdateDeliveryNote();
  const submitNote = useSubmitDeliveryNote();
  const cancelNote = useCancelDeliveryNote();

  function handleSubmit(data: DeliveryNoteFormValues) {
    updateNote.mutate(
      { name, data },
      {
        onSuccess: () => toast.success("Draft saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleSubmitDoc() {
    submitNote.mutate(name, {
      onSuccess: () => {
        toast.success("Delivery note submitted");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleCancelDoc() {
    cancelNote.mutate(name, {
      onSuccess: () => {
        toast.success("Delivery note cancelled");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <FormPageLayout title="Delivery Note" backHref="/delivery-notes">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!note) {
    return (
      <FormPageLayout title="Delivery Note Not Found" backHref="/delivery-notes">
        <p className="text-muted-foreground">This delivery note does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Delivery Note" action="read">
      <FormPageLayout title={note.name} backHref="/delivery-notes">
        <DeliveryNoteForm
          defaultValues={note}
          onSubmit={handleSubmit}
          isSubmitting={updateNote.isPending}
          isEdit
          onSubmitDoc={canSubmit("Delivery Note") ? handleSubmitDoc : undefined}
          onCancelDoc={canCancel("Delivery Note") ? handleCancelDoc : undefined}
          isSubmittingDoc={submitNote.isPending}
          isCancellingDoc={cancelNote.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
