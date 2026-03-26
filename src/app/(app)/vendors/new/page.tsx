"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { VendorForm } from "@/components/vendors/vendor-form";
import { useCreateSupplier } from "@/hooks/use-suppliers";
import type { SupplierFormValues } from "@/lib/schemas/supplier-schema";

export default function NewVendorPage() {
  const router = useRouter();
  const createSupplier = useCreateSupplier();

  function handleSubmit(data: SupplierFormValues) {
    createSupplier.mutate(data, {
      onSuccess: (supplier) => {
        toast.success("Vendor created");
        router.push(`/vendors/${encodeURIComponent(supplier.name)}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <PermissionGuard doctype="Supplier" action="create">
      <FormPageLayout title="New Vendor" backHref="/vendors">
        <VendorForm onSubmit={handleSubmit} isSubmitting={createSupplier.isPending} />
      </FormPageLayout>
    </PermissionGuard>
  );
}
