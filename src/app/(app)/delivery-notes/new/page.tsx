"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { DeliveryNoteForm } from "@/components/delivery-notes/delivery-note-form";
import { useCreateDeliveryNote } from "@/hooks/use-delivery-notes";
import { useSalesOrder } from "@/hooks/use-sales-orders";
import { useCompanyStore } from "@/stores/company-store";
import type { DeliveryNoteFormValues } from "@/lib/schemas/delivery-note-schema";
import type { DeliveryNote } from "@/types/delivery-note";

export default function NewDeliveryNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromSO = searchParams.get("from_so") ?? "";
  const { company } = useCompanyStore();
  const createNote = useCreateDeliveryNote();

  const { data: soDoc, isLoading: isLoadingSO } = useSalesOrder(fromSO);

  function handleSubmit(data: DeliveryNoteFormValues) {
    createNote.mutate(
      { ...data, company },
      {
        onSuccess: (note) => {
          toast.success("Delivery note created");
          router.push(`/delivery-notes/${encodeURIComponent(note.name)}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (fromSO && isLoadingSO) {
    return (
      <FormPageLayout title="New Delivery Note" backHref="/delivery-notes">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  const prefillDefaults: DeliveryNote | undefined = soDoc
    ? ({
        name: "",
        doctype: "Delivery Note",
        docstatus: 0,
        customer: soDoc.customer,
        posting_date: new Date().toISOString().slice(0, 10),
        company,
        items: soDoc.items.map((item) => ({
          doctype: "Delivery Note Item" as const,
          item_code: item.item_code,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          warehouse: "",
          against_sales_order: soDoc.name,
        })),
        total: soDoc.total,
        grand_total: soDoc.grand_total,
        status: "Draft",
      } as DeliveryNote)
    : undefined;

  return (
    <PermissionGuard doctype="Delivery Note" action="create">
      <FormPageLayout title="New Delivery Note" backHref="/delivery-notes">
        <DeliveryNoteForm
          defaultValues={prefillDefaults}
          onSubmit={handleSubmit}
          isSubmitting={createNote.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
