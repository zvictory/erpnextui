"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { SalesInvoiceForm } from "@/components/sales-invoices/sales-invoice-form";
import { useCreateSalesInvoice, useSalesInvoice } from "@/hooks/use-sales-invoices";
import { useSalesOrder } from "@/hooks/use-sales-orders";
import { useCompanyStore } from "@/stores/company-store";
import { useTranslations } from "next-intl";
import type { SalesInvoiceSubmitValues } from "@/lib/schemas/sales-invoice-schema";
import type { SalesInvoice } from "@/types/sales-invoice";

export default function NewSalesInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("invoices");
  const amendFrom = searchParams.get("amend_from") ?? "";
  const returnAgainst = searchParams.get("return_against") ?? "";
  const customerParam = searchParams.get("customer") ?? "";
  const fromSO = searchParams.get("from_so") ?? "";
  const { company } = useCompanyStore();
  const createInvoice = useCreateSalesInvoice();

  const sourceDocName = amendFrom || returnAgainst;
  const { data: sourceDoc, isLoading: isLoadingSource } = useSalesInvoice(sourceDocName);
  const { data: soDoc, isLoading: isLoadingSO } = useSalesOrder(fromSO);

  function handleSubmit(data: SalesInvoiceSubmitValues) {
    const payload: SalesInvoiceSubmitValues & {
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
        toast.success(returnAgainst ? t("creditNote") : "Sales invoice created");
        router.push(`/sales-invoices/${encodeURIComponent(invoice.name)}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if ((sourceDocName && isLoadingSource) || (fromSO && isLoadingSO)) {
    return (
      <FormPageLayout title="New Sales Invoice" backHref="/sales-invoices">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  // Build a "clean" default doc from the amend source (strip name/docstatus)
  const amendDefaults: SalesInvoice | undefined =
    amendFrom && sourceDoc
      ? {
          ...sourceDoc,
          name: "",
          docstatus: 0,
          status: "Draft",
          amended_from: amendFrom,
        }
      : undefined;

  // Build return defaults — negate quantities and amounts
  const returnDefaults: SalesInvoice | undefined =
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

  // Build defaults from a sales order
  const soDefaults: SalesInvoice | undefined =
    fromSO && soDoc
      ? ({
          name: "",
          doctype: "Sales Invoice",
          docstatus: 0,
          customer: soDoc.customer,
          posting_date: new Date().toISOString().slice(0, 10),
          due_date: "",
          company,
          currency: soDoc.currency as string | undefined,
          items: soDoc.items.map((item) => ({
            doctype: "Sales Invoice Item" as const,
            item_code: item.item_code,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
            uom: (item as Record<string, unknown>).uom as string | undefined,
            against_sales_order: soDoc.name,
          })),
          total: soDoc.total,
          grand_total: soDoc.grand_total,
          status: "Draft",
        } as SalesInvoice)
      : undefined;

  // Pre-fill customer from query param when not amending
  const prefillDefaults: SalesInvoice | undefined =
    !amendDefaults && !soDefaults && customerParam
      ? ({
          name: "",
          doctype: "Sales Invoice",
          docstatus: 0,
          customer: customerParam,
          posting_date: "",
          due_date: "",
          company,
          items: [],
          total: 0,
          grand_total: 0,
          status: "Draft",
        } as SalesInvoice)
      : undefined;

  return (
    <PermissionGuard doctype="Sales Invoice" action="create">
      <FormPageLayout
        title={
          returnAgainst
            ? `${t("creditNote")}: ${returnAgainst}`
            : amendFrom
              ? `Amend: ${amendFrom}`
              : fromSO
                ? `New Sales Invoice from ${fromSO}`
                : "New Sales Invoice"
        }
        backHref="/sales-invoices"
      >
        <SalesInvoiceForm
          defaultValues={returnDefaults ?? amendDefaults ?? soDefaults ?? prefillDefaults}
          onSubmit={handleSubmit}
          isSubmitting={createInvoice.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
