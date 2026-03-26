"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { VendorForm } from "@/components/vendors/vendor-form";
import { CustomerForm } from "@/components/customers/customer-form";
import { useSupplier, useCreateSupplier, useUpdateSupplier } from "@/hooks/use-suppliers";
import { useCustomer, useCreateCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import type { SupplierFormValues } from "@/lib/schemas/supplier-schema";
import type { CustomerFormValues } from "@/lib/schemas/customer-schema";
import { useTranslations } from "next-intl";

interface PartyFormDialogProps {
  partyType: "Customer" | "Supplier";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editName?: string | null;
  onSuccess?: (name: string) => void;
}

function SupplierDialogContent({
  editName,
  onSuccess,
  onClose,
}: {
  editName?: string | null;
  onSuccess?: (name: string) => void;
  onClose: () => void;
}) {
  const { data: existing, isLoading } = useSupplier(editName ?? "");
  const create = useCreateSupplier();
  const update = useUpdateSupplier();

  const isEdit = !!editName;
  const isPending = create.isPending || update.isPending;

  function handleSubmit(data: SupplierFormValues) {
    if (isEdit && editName) {
      update.mutate(
        { name: editName, data },
        {
          onSuccess: () => {
            toast.success("Vendor updated");
            onClose();
            onSuccess?.(editName);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      create.mutate(data, {
        onSuccess: (doc) => {
          toast.success("Vendor created");
          onClose();
          onSuccess?.(doc.name);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    );
  }

  return (
    <VendorForm
      defaultValues={existing}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      isEdit={isEdit}
    />
  );
}

function CustomerDialogContent({
  editName,
  onSuccess,
  onClose,
}: {
  editName?: string | null;
  onSuccess?: (name: string) => void;
  onClose: () => void;
}) {
  const { data: existing, isLoading } = useCustomer(editName ?? "");
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  const isEdit = !!editName;
  const isPending = create.isPending || update.isPending;

  function handleSubmit(data: CustomerFormValues) {
    if (isEdit && editName) {
      update.mutate(
        { name: editName, data },
        {
          onSuccess: () => {
            toast.success("Customer updated");
            onClose();
            onSuccess?.(editName);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      create.mutate(data, {
        onSuccess: (doc) => {
          toast.success("Customer created");
          onClose();
          onSuccess?.(doc.name);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    );
  }

  return (
    <CustomerForm
      defaultValues={existing}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      isEdit={isEdit}
    />
  );
}

export function PartyFormDialog({
  partyType,
  open,
  onOpenChange,
  editName,
  onSuccess,
}: PartyFormDialogProps) {
  const tVendors = useTranslations("vendors");
  const tCustomers = useTranslations("customers");
  const tCommon = useTranslations("common");
  const isEdit = !!editName;
  const label = partyType === "Supplier" ? tVendors("vendor") : tCustomers("customer");
  const title = isEdit ? `${tCommon("edit")} ${label}` : `${tCommon("new")} ${label}`;

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update ${label} details.` : `Create a new ${label}.`}
          </DialogDescription>
        </DialogHeader>

        {partyType === "Supplier" ? (
          <SupplierDialogContent editName={editName} onSuccess={onSuccess} onClose={handleClose} />
        ) : (
          <CustomerDialogContent editName={editName} onSuccess={onSuccess} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
