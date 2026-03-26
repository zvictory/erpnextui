"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { CustomerForm } from "@/components/customers/customer-form";
import { useCreateCustomer } from "@/hooks/use-customers";
import type { CustomerFormValues } from "@/lib/schemas/customer-schema";

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  function handleSubmit(data: CustomerFormValues) {
    createCustomer.mutate(data, {
      onSuccess: (customer) => {
        toast.success("Customer created");
        router.push(`/customers/${encodeURIComponent(customer.name)}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <PermissionGuard doctype="Customer" action="create">
      <FormPageLayout title="New Customer" backHref="/customers">
        <CustomerForm onSubmit={handleSubmit} isSubmitting={createCustomer.isPending} />
      </FormPageLayout>
    </PermissionGuard>
  );
}
