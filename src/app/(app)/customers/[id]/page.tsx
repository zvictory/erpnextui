"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { CustomerForm } from "@/components/customers/customer-form";
import { useCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import type { CustomerFormValues } from "@/lib/schemas/customer-schema";

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const { data: customer, isLoading } = useCustomer(name);
  const updateCustomer = useUpdateCustomer();

  function handleSubmit(data: CustomerFormValues) {
    updateCustomer.mutate(
      { name, data },
      {
        onSuccess: () => {
          toast.success("Customer updated");
          router.push("/customers");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (isLoading) {
    return (
      <FormPageLayout title="Edit Customer" backHref="/customers">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!customer) {
    return (
      <FormPageLayout title="Customer Not Found" backHref="/customers">
        <p className="text-muted-foreground">This customer does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Customer" action="write">
      <FormPageLayout title={`Edit: ${customer.customer_name}`} backHref="/customers">
        <CustomerForm
          defaultValues={customer}
          onSubmit={handleSubmit}
          isSubmitting={updateCustomer.isPending}
          isEdit
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
