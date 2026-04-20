"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { DateInput } from "@/components/shared/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LinkField } from "@/components/shared/link-field";
import { InvoiceItemsEditor } from "@/components/shared/invoice-items-editor";
import { TaxSection } from "@/components/shared/tax-section";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import {
  purchaseInvoiceSchema,
  type PurchaseInvoiceFormValues,
} from "@/lib/schemas/purchase-invoice-schema";
import type { PurchaseInvoice } from "@/types/purchase-invoice";
import type { TaxRow } from "@/types/tax";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useSupplier } from "@/hooks/use-suppliers";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface PurchaseInvoiceFormProps {
  defaultValues?: PurchaseInvoice;
  onSubmit: (data: PurchaseInvoiceFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onSubmitDoc?: () => void;
  onCancelDoc?: () => void;
  isSubmittingDoc?: boolean;
  isCancellingDoc?: boolean;
  onCreateReturn?: () => void;
  returnLabel?: string;
  onPay?: () => void;
}

export function PurchaseInvoiceForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onSubmitDoc,
  onCancelDoc,
  isSubmittingDoc = false,
  isCancellingDoc = false,
  onCreateReturn,
  returnLabel,
  onPay,
}: PurchaseInvoiceFormProps) {
  const t = useTranslations("invoices");
  const docstatus = defaultValues?.docstatus ?? 0;
  const isReadOnly = docstatus > 0;

  const { currencySymbol: companyCurrencySymbol, symbolOnRight: companySymbolOnRight } =
    useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();

  const [taxTemplate, setTaxTemplate] = useState(
    ((defaultValues as unknown as Record<string, unknown>)?.taxes_and_charges as string) ?? "",
  );
  const [taxes, setTaxes] = useState<TaxRow[]>([]);

  const form = useForm<PurchaseInvoiceFormValues>({
    mode: "onChange",
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: defaultValues
      ? {
          supplier: defaultValues.supplier,
          posting_date: defaultValues.posting_date,
          due_date: defaultValues.due_date,
          items: defaultValues.items.map((item) => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
          })),
        }
      : {
          supplier: "",
          posting_date: getToday(),
          due_date: addDays(getToday(), 10),
          items: [{ item_code: "", qty: 1, rate: 0, amount: 0 }],
        },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = form;

  const postingDate = watch("posting_date");
  const watchedSupplier = watch("supplier");
  // useWatch triggers re-render on deep field changes (unlike watch)
  const items = useWatch({ control: form.control, name: "items" });

  // Resolve currency from supplier or invoice
  const { data: supplierDoc } = useSupplier(watchedSupplier);
  const effectiveCurrency =
    docstatus > 0
      ? defaultValues?.currency || supplierDoc?.default_currency
      : supplierDoc?.default_currency || defaultValues?.currency;
  const currInfo =
    typeof effectiveCurrency === "string" ? currencyMap?.get(effectiveCurrency) : undefined;
  const currencySymbol = currInfo?.symbol ?? companyCurrencySymbol;
  const symbolOnRight = currInfo?.onRight ?? companySymbolOnRight;

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [items]);

  // Auto-set due_date = posting_date + 10 days
  useEffect(() => {
    if (postingDate && !isReadOnly) {
      setValue("due_date", addDays(postingDate, 10), { shouldValidate: true });
    }
  }, [postingDate, isReadOnly, setValue]);

  function handleFormSubmit(data: PurchaseInvoiceFormValues) {
    const submitData: PurchaseInvoiceFormValues & Record<string, unknown> = { ...data };
    if (taxTemplate) {
      submitData.taxes_and_charges = taxTemplate;
      submitData.taxes = taxes.map((row) => ({
        charge_type: row.charge_type,
        account_head: row.account_head,
        description: row.description,
        rate: row.rate,
        tax_amount: row.tax_amount,
      }));
    }
    onSubmit(submitData as PurchaseInvoiceFormValues);
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {isEdit && defaultValues && (
          <div className="flex items-center gap-3">
            <DocstatusBadge docstatus={defaultValues.docstatus} status={defaultValues.status} />
            <span className="text-sm text-muted-foreground">{defaultValues.name}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              {t("supplier")} <span className="text-destructive">*</span>
            </Label>
            <LinkField
              doctype="Supplier"
              value={watch("supplier")}
              onChange={(v) => setValue("supplier", v, { shouldValidate: true })}
              disabled={isReadOnly}
              descriptionField="supplier_name"
              displayValue={supplierDoc?.supplier_name}
            />
            {errors.supplier && (
              <p className="text-sm text-destructive">{errors.supplier.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="posting_date">
              {t("postingDate")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="posting_date"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  id="posting_date"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  disabled={isReadOnly}
                />
              )}
            />
            {errors.posting_date && (
              <p className="text-sm text-destructive">{errors.posting_date.message}</p>
            )}
          </div>
        </div>

        <Separator />

        <InvoiceItemsEditor
          disabled={isReadOnly}
          allowServiceLines
          currencySymbol={currencySymbol}
          symbolOnRight={symbolOnRight}
        />

        {errors.items && (
          <p className="text-sm text-destructive">
            {typeof errors.items.message === "string" ? errors.items.message : t("pleaseAddItem")}
          </p>
        )}

        <TaxSection
          taxTemplateDoctype="Purchase Taxes and Charges Template"
          selectedTemplate={taxTemplate}
          onTemplateChange={setTaxTemplate}
          taxes={taxes}
          onTaxesChange={setTaxes}
          subtotal={subtotal}
          isEditable={!isReadOnly}
        />

        <div className="flex justify-end gap-3 pt-2">
          {docstatus === 0 && (
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? t("saving") : isEdit ? t("saveDraft") : t("createDraft")}
            </Button>
          )}
          {isEdit && docstatus === 0 && onSubmitDoc && (
            <Button
              type="button"
              variant="default"
              onClick={onSubmitDoc}
              disabled={isSubmittingDoc}
            >
              {isSubmittingDoc ? t("submitting") : t("submit")}
            </Button>
          )}
          {isEdit && docstatus === 1 && onPay && (
            <Button type="button" variant="default" onClick={onPay}>
              {t("pay")}
            </Button>
          )}
          {isEdit && docstatus === 1 && onCreateReturn && (
            <Button type="button" variant="outline" onClick={onCreateReturn}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              {returnLabel ?? t("createReturn")}
            </Button>
          )}
          {isEdit && docstatus === 1 && onCancelDoc && (
            <Button
              type="button"
              variant="destructive"
              onClick={onCancelDoc}
              disabled={isCancellingDoc}
            >
              {isCancellingDoc ? t("cancelling") : t("cancelInvoice")}
            </Button>
          )}
          {isEdit && docstatus === 2 && (
            <Button type="button" variant="outline" asChild>
              <a
                href={`/purchase-invoices/new?amend_from=${encodeURIComponent(defaultValues?.name ?? "")}`}
              >
                {t("amend")}
              </a>
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
