"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { PurchaseInvoiceForm } from "@/components/purchase-invoices/purchase-invoice-form";
import { useCreatePurchaseInvoice, usePurchaseInvoice } from "@/hooks/use-purchase-invoices";
import { useCompanyStore } from "@/stores/company-store";
import { useTranslations } from "next-intl";
import type { PurchaseInvoiceFormValues } from "@/lib/schemas/purchase-invoice-schema";
import type { PurchaseInvoice } from "@/types/purchase-invoice";

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("invoices");
  const amendFrom = searchParams.get("amend_from") ?? "";
  const returnAgainst = searchParams.get("return_against") ?? "";
  const supplierParam = searchParams.get("supplier") ?? "";
  const { company } = useCompanyStore();
  const createInvoice = useCreatePurchaseInvoice();

  const sourceDocName = amendFrom || returnAgainst;
  const { data: sourceDoc, isLoading: isLoadingSource } = usePurchaseInvoice(sourceDocName);

  function handleSubmit(data: PurchaseInvoiceFormValues) {
    const payload: PurchaseInvoiceFormValues & {
      company: string;
      is_return?: 1;
      return_against?: string;
    } = {
      ...data,
      company,
    };
    if (returnAgainst) {
      payload.is_return = 1;
      payload.return_against = returnAgainst;
    }
    createInvoice.mutate(payload, {
      onSuccess: (invoice) => {
        toast.success(returnAgainst ? t("debitNote") : "Purchase invoice created");
        router.push(`/purchase-invoices/${encodeURIComponent(invoice.name)}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (sourceDocName && isLoadingSource) {
    return (
      <FormPageLayout title="New Purchase Invoice" backHref="/purchase-invoices">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  const amendDefaults: PurchaseInvoice | undefined =
    amendFrom && sourceDoc
      ? {
          ...sourceDoc,
          name: "",
          docstatus: 0,
          status: "Draft",
          amended_from: amendFrom,
        }
      : undefined;

  // Build return defaults -- negate quantities and amounts
  const returnDefaults: PurchaseInvoice | undefined =
    returnAgainst && sourceDoc
      ? {
          ...sourceDoc,
          name: "",
          docstatus: 0,
          status: "Draft",
          is_return: 1,
          return_against: returnAgainst,
          items: sourceDoc.items.map((item) => ({
            ...item,
            qty: -Math.abs(item.qty),
            amount: -Math.abs(item.amount),
          })),
          total: -Math.abs(sourceDoc.total),
          grand_total: -Math.abs(sourceDoc.grand_total),
        }
      : undefined;

  // Pre-fill supplier from query param when not amending
  const prefillDefaults: PurchaseInvoice | undefined =
    !amendDefaults && supplierParam
      ? ({
          name: "",
          doctype: "Purchase Invoice",
          docstatus: 0,
          supplier: supplierParam,
          posting_date: new Date().toISOString().slice(0, 10),
          due_date: "",
          company,
          items: [],
          total: 0,
          grand_total: 0,
          status: "Draft",
        } as PurchaseInvoice)
      : undefined;

  return (
    <PermissionGuard doctype="Purchase Invoice" action="create">
      <FormPageLayout
        title={
          returnAgainst
            ? `${t("debitNote")}: ${returnAgainst}`
            : amendFrom
              ? `Amend: ${amendFrom}`
              : "New Purchase Invoice"
        }
        backHref="/purchase-invoices"
      >
        <PurchaseInvoiceForm
          defaultValues={returnDefaults ?? amendDefaults ?? prefillDefaults}
          onSubmit={handleSubmit}
          isSubmitting={createInvoice.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
