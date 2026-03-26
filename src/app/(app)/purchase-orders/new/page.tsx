"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { useCreatePurchaseOrder, usePurchaseOrder } from "@/hooks/use-purchase-orders";
import { useCompanyStore } from "@/stores/company-store";
import type { PurchaseOrderFormValues } from "@/lib/schemas/purchase-order-schema";
import type { PurchaseOrder } from "@/types/purchase-order";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amendFrom = searchParams.get("amend_from") ?? "";
  const supplierParam = searchParams.get("supplier") ?? "";
  const { company } = useCompanyStore();
  const createOrder = useCreatePurchaseOrder();

  const { data: amendDoc, isLoading: isLoadingAmend } = usePurchaseOrder(amendFrom);

  function handleSubmit(data: PurchaseOrderFormValues) {
    createOrder.mutate(
      { ...data, company },
      {
        onSuccess: (order) => {
          toast.success("Purchase order created");
          router.push(`/purchase-orders/${encodeURIComponent(order.name)}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (amendFrom && isLoadingAmend) {
    return (
      <FormPageLayout title="New Purchase Order" backHref="/purchase-orders">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  const amendDefaults: PurchaseOrder | undefined = amendDoc
    ? {
        ...amendDoc,
        name: "",
        docstatus: 0,
        status: "Draft",
        amended_from: amendFrom,
      }
    : undefined;

  const prefillDefaults: PurchaseOrder | undefined =
    !amendDefaults && supplierParam
      ? ({
          name: "",
          doctype: "Purchase Order",
          docstatus: 0,
          supplier: supplierParam,
          transaction_date: new Date().toISOString().slice(0, 10),
          company,
          items: [],
          total: 0,
          grand_total: 0,
          status: "Draft",
          per_billed: 0,
          per_received: 0,
        } as PurchaseOrder)
      : undefined;

  return (
    <PermissionGuard doctype="Purchase Order" action="create">
      <FormPageLayout
        title={amendFrom ? `Amend: ${amendFrom}` : "New Purchase Order"}
        backHref="/purchase-orders"
      >
        <PurchaseOrderForm
          defaultValues={amendDefaults ?? prefillDefaults}
          onSubmit={handleSubmit}
          isSubmitting={createOrder.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
