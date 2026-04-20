"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { SalesOrderForm } from "@/components/sales-orders/sales-order-form";
import { useCreateSalesOrder, useSalesOrder } from "@/hooks/use-sales-orders";
import { useCompanyStore } from "@/stores/company-store";
import type { SalesOrderSubmitValues } from "@/lib/schemas/sales-order-schema";
import type { SalesOrder } from "@/types/sales-order";

export default function NewSalesOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amendFrom = searchParams.get("amend_from") ?? "";
  const customerParam = searchParams.get("customer") ?? "";
  const { company } = useCompanyStore();
  const createOrder = useCreateSalesOrder();

  const { data: amendDoc, isLoading: isLoadingAmend } = useSalesOrder(amendFrom);

  function handleSubmit(data: SalesOrderSubmitValues) {
    createOrder.mutate(
      { ...data, company },
      {
        onSuccess: (order) => {
          toast.success("Sales order created");
          router.push(`/sales-orders/${encodeURIComponent(order.name)}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (amendFrom && isLoadingAmend) {
    return (
      <FormPageLayout title="New Sales Order" backHref="/sales-orders">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  const amendDefaults: SalesOrder | undefined = amendDoc
    ? {
        ...amendDoc,
        name: "",
        docstatus: 0,
        status: "Draft",
        amended_from: amendFrom,
      }
    : undefined;

  const prefillDefaults: SalesOrder | undefined =
    !amendDefaults && customerParam
      ? ({
          name: "",
          doctype: "Sales Order",
          docstatus: 0,
          customer: customerParam,
          transaction_date: new Date().toISOString().slice(0, 10),
          delivery_date: new Date().toISOString().slice(0, 10),
          company,
          items: [
            { doctype: "Sales Order Item", item_code: "", qty: 1, rate: 0, amount: 0 },
            { doctype: "Sales Order Item", item_code: "", qty: 1, rate: 0, amount: 0 },
            { doctype: "Sales Order Item", item_code: "", qty: 1, rate: 0, amount: 0 },
          ],
          total: 0,
          grand_total: 0,
          status: "Draft",
          per_billed: 0,
          per_delivered: 0,
        } as SalesOrder)
      : undefined;

  return (
    <PermissionGuard doctype="Sales Order" action="create">
      <FormPageLayout
        title={amendFrom ? `Amend: ${amendFrom}` : "New Sales Order"}
        backHref="/sales-orders"
      >
        <SalesOrderForm
          defaultValues={amendDefaults ?? prefillDefaults}
          onSubmit={handleSubmit}
          isSubmitting={createOrder.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
