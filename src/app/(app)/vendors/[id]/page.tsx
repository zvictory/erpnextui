"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { VendorForm } from "@/components/vendors/vendor-form";
import { useSupplier, useUpdateSupplier } from "@/hooks/use-suppliers";
import type { SupplierFormValues } from "@/lib/schemas/supplier-schema";

export default function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const { data: supplier, isLoading } = useSupplier(name);
  const updateSupplier = useUpdateSupplier();

  function handleSubmit(data: SupplierFormValues) {
    updateSupplier.mutate(
      { name, data },
      {
        onSuccess: () => {
          toast.success("Vendor updated");
          router.push("/vendors");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (isLoading) {
    return (
      <FormPageLayout title="Edit Vendor" backHref="/vendors">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!supplier) {
    return (
      <FormPageLayout title="Vendor Not Found" backHref="/vendors">
        <p className="text-muted-foreground">This vendor does not exist.</p>
      </FormPageLayout>
    );
  }

  return (
    <PermissionGuard doctype="Supplier" action="write">
      <FormPageLayout title={`Edit: ${supplier.supplier_name}`} backHref="/vendors">
        <VendorForm
          defaultValues={supplier}
          onSubmit={handleSubmit}
          isSubmitting={updateSupplier.isPending}
          isEdit
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
