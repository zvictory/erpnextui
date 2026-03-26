"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import {
  usePurchaseOrder,
  useUpdatePurchaseOrder,
  useSubmitPurchaseOrder,
  useCancelPurchaseOrder,
} from "@/hooks/use-purchase-orders";
import { usePermissions } from "@/hooks/use-permissions";
import type { PurchaseOrderFormValues } from "@/lib/schemas/purchase-order-schema";
import { RelatedDocuments } from "@/components/shared/related-documents";

export default function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const { data: order, isLoading } = usePurchaseOrder(name);
  const { canSubmit, canCancel } = usePermissions();
  const updateOrder = useUpdatePurchaseOrder();
  const submitOrder = useSubmitPurchaseOrder();
  const cancelOrder = useCancelPurchaseOrder();

  function handleSubmit(data: PurchaseOrderFormValues) {
    updateOrder.mutate(
      { name, data },
      {
        onSuccess: () => toast.success("Draft saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleSubmitDoc() {
    submitOrder.mutate(name, {
      onSuccess: () => {
        toast.success("Order submitted");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleCancelDoc() {
    cancelOrder.mutate(name, {
      onSuccess: () => {
        toast.success("Order cancelled");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <FormPageLayout title="Purchase Order" backHref="/purchase-orders">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!order) {
    return (
      <FormPageLayout title="Order Not Found" backHref="/purchase-orders">
        <p className="text-muted-foreground">This order does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Purchase Order" action="read">
      <FormPageLayout title={order.name} backHref="/purchase-orders">
        <PurchaseOrderForm
          defaultValues={order}
          onSubmit={handleSubmit}
          isSubmitting={updateOrder.isPending}
          isEdit
          onSubmitDoc={canSubmit("Purchase Order") ? handleSubmitDoc : undefined}
          onCancelDoc={canCancel("Purchase Order") ? handleCancelDoc : undefined}
          isSubmittingDoc={submitOrder.isPending}
          isCancellingDoc={cancelOrder.isPending}
        />
        <RelatedDocuments doctype="Purchase Order" name={name} />
      </FormPageLayout>
    </PermissionGuard>
  );
}
