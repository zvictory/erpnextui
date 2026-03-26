"use client";

import { useTranslations } from "next-intl";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { DateInput } from "@/components/shared/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LinkField } from "@/components/shared/link-field";
import { InvoiceItemsEditor } from "@/components/shared/invoice-items-editor";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import {
  purchaseOrderSchema,
  type PurchaseOrderFormValues,
} from "@/lib/schemas/purchase-order-schema";
import type { PurchaseOrder } from "@/types/purchase-order";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface PurchaseOrderFormProps {
  defaultValues?: PurchaseOrder;
  onSubmit: (data: PurchaseOrderFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onSubmitDoc?: () => void;
  onCancelDoc?: () => void;
  isSubmittingDoc?: boolean;
  isCancellingDoc?: boolean;
}

export function PurchaseOrderForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onSubmitDoc,
  onCancelDoc,
  isSubmittingDoc = false,
  isCancellingDoc = false,
}: PurchaseOrderFormProps) {
  const t = useTranslations("orders");
  const docstatus = defaultValues?.docstatus ?? 0;
  const isReadOnly = docstatus > 0;

  const form = useForm<PurchaseOrderFormValues>({
    mode: "onChange",
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: defaultValues
      ? {
          supplier: defaultValues.supplier,
          transaction_date: defaultValues.transaction_date,
          items: defaultValues.items.map((item) => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
          })),
        }
      : {
          supplier: "",
          transaction_date: getToday(),
          items: [{ item_code: "", qty: 1, rate: 0, amount: 0 }],
        },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = form;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            />
            {errors.supplier && (
              <p className="text-sm text-destructive">{errors.supplier.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transaction_date">
              {t("transactionDate")} <span className="text-destructive">*</span>
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
        </div>

        <Separator />

        <InvoiceItemsEditor disabled={isReadOnly} />

        {errors.items && (
          <p className="text-sm text-destructive">
            {typeof errors.items.message === "string" ? errors.items.message : t("addItem")}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {isEdit && docstatus === 1 && defaultValues && (
            <Button type="button" variant="outline" asChild>
              <a href={`/purchase-invoices/new?from_po=${encodeURIComponent(defaultValues.name)}`}>
                <FileText className="h-4 w-4 mr-1.5" />
                {t("createInvoice")}
              </a>
            </Button>
          )}
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
          {isEdit && docstatus === 1 && onCancelDoc && (
            <Button
              type="button"
              variant="destructive"
              onClick={onCancelDoc}
              disabled={isCancellingDoc}
            >
              {isCancellingDoc ? t("submitting") : t("cancelOrder")}
            </Button>
          )}
          {isEdit && docstatus === 2 && (
            <Button type="button" variant="outline" asChild>
              <a
                href={`/purchase-orders/new?amend_from=${encodeURIComponent(defaultValues?.name ?? "")}`}
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
