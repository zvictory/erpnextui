"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { QuotationForm } from "@/components/quotations/quotation-form";
import { useCreateQuotation } from "@/hooks/use-quotations";
import { useCompanyStore } from "@/stores/company-store";
import type { QuotationFormValues } from "@/lib/schemas/quotation-schema";
import type { Quotation } from "@/types/quotation";

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerParam = searchParams.get("customer") ?? "";
  const { company } = useCompanyStore();
  const createQuotation = useCreateQuotation();

  function handleSubmit(data: QuotationFormValues) {
    createQuotation.mutate(
      { ...data, company },
      {
        onSuccess: (quotation) => {
          toast.success("Quotation created");
          router.push(`/quotations/${encodeURIComponent(quotation.name)}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const prefillDefaults: Quotation | undefined = customerParam
    ? ({
        name: "",
        doctype: "Quotation",
        docstatus: 0,
        quotation_to: "Customer",
        party_name: customerParam,
        transaction_date: new Date().toISOString().slice(0, 10),
        valid_till: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d.toISOString().slice(0, 10);
        })(),
        company,
        items: [],
        total: 0,
        grand_total: 0,
        status: "Draft",
      } as Quotation)
    : undefined;

  return (
    <PermissionGuard doctype="Quotation" action="create">
      <FormPageLayout title="New Quotation" backHref="/quotations">
        <QuotationForm
          defaultValues={prefillDefaults}
          onSubmit={handleSubmit}
          isSubmitting={createQuotation.isPending}
        />
      </FormPageLayout>
    </PermissionGuard>
  );
}
