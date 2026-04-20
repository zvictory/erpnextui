"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart, FileText } from "lucide-react";
import { DateInput } from "@/components/shared/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LinkField } from "@/components/shared/link-field";
import { InvoiceItemsEditor } from "@/components/shared/invoice-items-editor";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import { useCompanyStore } from "@/stores/company-store";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { quotationSchema, type QuotationFormValues } from "@/lib/schemas/quotation-schema";
import type { Quotation } from "@/types/quotation";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface QuotationFormProps {
  defaultValues?: Quotation;
  onSubmit: (data: QuotationFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onSubmitDoc?: () => void;
  onCancelDoc?: () => void;
  isSubmittingDoc?: boolean;
  isCancellingDoc?: boolean;
}

export function QuotationForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onSubmitDoc,
  onCancelDoc,
  isSubmittingDoc = false,
  isCancellingDoc = false,
}: QuotationFormProps) {
  const t = useTranslations("quotations");
  const company = useCompanyStore((s) => s.company);
  const sellingWarehouse = useUISettingsStore(
    (s) => s.getCompanySettings(company).sellingWarehouse,
  );
  const docstatus = defaultValues?.docstatus ?? 0;
  const isReadOnly = docstatus > 0;

  const form = useForm<QuotationFormValues>({
    mode: "onChange",
    resolver: zodResolver(quotationSchema),
    defaultValues: defaultValues
      ? {
          party_name: defaultValues.party_name,
          transaction_date: defaultValues.transaction_date,
          valid_till: defaultValues.valid_till ?? defaultValues.transaction_date,
          items: defaultValues.items.map((item) => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
          })),
        }
      : {
          party_name: "",
          transaction_date: getToday(),
          valid_till: getDatePlusDays(30),
          items: [{ item_code: "", qty: 1, rate: 0, amount: 0 }],
        },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = form;

  const transactionDate = watch("transaction_date");
  const validTill = watch("valid_till");

  useEffect(() => {
    if (transactionDate && validTill && validTill < transactionDate) {
      setValue("valid_till", transactionDate, { shouldValidate: true });
    }
  }, [transactionDate, validTill, setValue]);

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {isEdit && defaultValues && (
          <div className="flex items-center gap-3">
            <DocstatusBadge docstatus={defaultValues.docstatus} status={defaultValues.status} />
            <span className="text-sm text-muted-foreground">{defaultValues.name}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>
              {t("customer")} <span className="text-destructive">*</span>
            </Label>
            <LinkField
              doctype="Customer"
              descriptionField="customer_name"
              value={watch("party_name")}
              onChange={(v) => setValue("party_name", v, { shouldValidate: true })}
              disabled={isReadOnly}
            />
            {errors.party_name && (
              <p className="text-sm text-destructive">{errors.party_name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transaction_date">
              {t("date")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="transaction_date"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  id="transaction_date"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  disabled={isReadOnly}
                />
              )}
            />
            {errors.transaction_date && (
              <p className="text-sm text-destructive">{errors.transaction_date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valid_till">
              {t("validTill")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="valid_till"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  id="valid_till"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  min={watch("transaction_date")}
                  disabled={isReadOnly}
                />
              )}
            />
            {errors.valid_till && (
              <p className="text-sm text-destructive">{errors.valid_till.message}</p>
            )}
          </div>
        </div>

        <Separator />

        <InvoiceItemsEditor disabled={isReadOnly} sellingWarehouse={sellingWarehouse} />

        {errors.items && (
          <p className="text-sm text-destructive">
            {typeof errors.items.message === "string" ? errors.items.message : t("addItem")}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {isEdit && docstatus === 1 && defaultValues && (
            <>
              <Button type="button" variant="outline" asChild>
                <a
                  href={`/sales-orders/new?from_quotation=${encodeURIComponent(defaultValues.name)}`}
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  {t("createSalesOrder")}
                </a>
              </Button>
              <Button type="button" variant="outline" asChild>
                <a
                  href={`/sales-invoices/new?from_quotation=${encodeURIComponent(defaultValues.name)}`}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  {t("createInvoice")}
                </a>
              </Button>
            </>
          )}
          {docstatus === 0 && (
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? t("saving") : isEdit ? t("saveDraft") : t("saveDraft")}
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
          {isEdit && docstatus === 1 && onCancelDoc && (
            <Button
              type="button"
              variant="destructive"
              onClick={onCancelDoc}
              disabled={isCancellingDoc}
            >
              {isCancellingDoc ? t("submitting") : t("cancel")}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
