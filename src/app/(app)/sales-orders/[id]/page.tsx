"use client";

import { use } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { SalesOrderForm } from "@/components/sales-orders/sales-order-form";
import {
  useSalesOrder,
  useUpdateSalesOrder,
  useSubmitSalesOrder,
  useCancelSalesOrder,
} from "@/hooks/use-sales-orders";
import { usePermissions } from "@/hooks/use-permissions";
import type { SalesOrderSubmitValues } from "@/lib/schemas/sales-order-schema";
import { RelatedDocuments } from "@/components/shared/related-documents";

export default function EditSalesOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const { data: order, isLoading } = useSalesOrder(name);
  const { canSubmit, canCancel } = usePermissions();
  const updateOrder = useUpdateSalesOrder();
  const submitOrder = useSubmitSalesOrder();
  const cancelOrder = useCancelSalesOrder();

  function handleSubmit(data: SalesOrderSubmitValues) {
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
      onSuccess: () => toast.success("Order submitted"),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleCancelDoc() {
    cancelOrder.mutate(name, {
      onSuccess: () => toast.success("Order cancelled"),
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <FormPageLayout title="Sales Order" backHref="/sales-orders">
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
      <FormPageLayout title="Order Not Found" backHref="/sales-orders">
        <p className="text-muted-foreground">This order does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Sales Order" action="read">
      <FormPageLayout title={order.name} backHref="/sales-orders">
        <SalesOrderForm
          defaultValues={order}
          onSubmit={handleSubmit}
          isSubmitting={updateOrder.isPending}
          isEdit
          onSubmitDoc={canSubmit("Sales Order") ? handleSubmitDoc : undefined}
          onCancelDoc={canCancel("Sales Order") ? handleCancelDoc : undefined}
          isSubmittingDoc={submitOrder.isPending}
          isCancellingDoc={cancelOrder.isPending}
        />
        <RelatedDocuments doctype="Sales Order" name={name} />
      </FormPageLayout>
    </PermissionGuard>
  );
}
