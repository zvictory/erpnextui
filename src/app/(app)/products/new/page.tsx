"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { ProductForm } from "@/components/products/product-form";
import { useCreateItem } from "@/hooks/use-items";
import type { ItemFormValues } from "@/lib/schemas/item-schema";

export default function NewProductPage() {
  const router = useRouter();
  const createItem = useCreateItem();

  function handleSubmit(data: ItemFormValues) {
    createItem.mutate(data, {
      onSuccess: (item) => {
        toast.success("Product created");
        router.push(`/products/${encodeURIComponent(item.name)}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <PermissionGuard doctype="Item" action="create">
      <FormPageLayout title="New Product" backHref="/products">
        <ProductForm onSubmit={handleSubmit} isSubmitting={createItem.isPending} />
      </FormPageLayout>
    </PermissionGuard>
  );
}
