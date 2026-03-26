"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { ProductForm } from "@/components/products/product-form";
import { ProductSerialNumbersTable } from "@/components/products/product-serial-numbers-table";
import { useItem, useUpdateItem } from "@/hooks/use-items";
import type { ItemFormValues } from "@/lib/schemas/item-schema";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const router = useRouter();
  const { data: item, isLoading } = useItem(name);
  const updateItem = useUpdateItem();

  function handleSubmit(data: ItemFormValues) {
    updateItem.mutate(
      { name, data },
      {
        onSuccess: () => {
          toast.success("Product updated");
          router.push("/products");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Edit Product</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="sr-only">Edit Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Product Not Found</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="sr-only">Product Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This product does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PermissionGuard doctype="Item" action="write">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Edit: {item.item_name}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="sr-only">Edit: {item.item_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm
              defaultValues={item}
              onSubmit={handleSubmit}
              isSubmitting={updateItem.isPending}
              isEdit
            />
          </CardContent>
        </Card>

        {item.has_serial_no === 1 && (
          <ProductSerialNumbersTable itemCode={item.item_code} />
        )}
      </div>
    </PermissionGuard>
  );
}
