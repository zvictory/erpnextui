"use client";

import { useTranslations } from "next-intl";
import { useForm, FormProvider, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Plus, Trash2 } from "lucide-react";
import { DateInput } from "@/components/shared/date-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LinkField } from "@/components/shared/link-field";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import {
  deliveryNoteSchema,
  type DeliveryNoteFormValues,
} from "@/lib/schemas/delivery-note-schema";
import type { DeliveryNote } from "@/types/delivery-note";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DeliveryNoteFormProps {
  defaultValues?: DeliveryNote;
  onSubmit: (data: DeliveryNoteFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onSubmitDoc?: () => void;
  onCancelDoc?: () => void;
  isSubmittingDoc?: boolean;
  isCancellingDoc?: boolean;
}

export function DeliveryNoteForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onSubmitDoc,
  onCancelDoc,
  isSubmittingDoc = false,
  isCancellingDoc = false,
}: DeliveryNoteFormProps) {
  const t = useTranslations("deliveryNotes");
  const docstatus = defaultValues?.docstatus ?? 0;
  const isReadOnly = docstatus > 0;

  const form = useForm<DeliveryNoteFormValues>({
    mode: "onChange",
    resolver: zodResolver(deliveryNoteSchema),
    defaultValues: defaultValues
      ? {
          customer: defaultValues.customer,
          posting_date: defaultValues.posting_date,
          items: defaultValues.items.map((item) => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
            warehouse: item.warehouse ?? "",
            against_sales_order: item.against_sales_order,
            so_detail: item.so_detail,
          })),
        }
      : {
          customer: "",
          posting_date: getToday(),
          items: [{ item_code: "", qty: 1, rate: 0, amount: 0, warehouse: "" }],
        },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors, isValid },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  function recalcRow(index: number) {
    const qty = form.getValues(`items.${index}.qty`) || 0;
    const rate = form.getValues(`items.${index}.rate`) || 0;
    setValue(`items.${index}.amount`, qty * rate, { shouldValidate: true });
  }

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
              {t("customer")} <span className="text-destructive">*</span>
            </Label>
            <LinkField
              doctype="Customer"
              value={watch("customer")}
              onChange={(v) => setValue("customer", v, { shouldValidate: true })}
              disabled={isReadOnly}
            />
            {errors.customer && (
              <p className="text-sm text-destructive">{errors.customer.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="posting_date">
              {t("date")} <span className="text-destructive">*</span>
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

        <div className="space-y-3">
          <Label>{t("items")}</Label>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 sm:grid-cols-6 items-end">
                <div className="sm:col-span-2 space-y-1">
                  {index === 0 && (
                    <span className="text-xs text-muted-foreground">{t("items")}</span>
                  )}
                  <LinkField
                    doctype="Item"
                    value={watch(`items.${index}.item_code`)}
                    onChange={(v) =>
                      setValue(`items.${index}.item_code`, v, { shouldValidate: true })
                    }
                    disabled={isReadOnly}
                    descriptionField="item_name"
                    showValueWithDescription
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && (
                    <span className="text-xs text-muted-foreground">{t("warehouse")}</span>
                  )}
                  <LinkField
                    doctype="Warehouse"
                    value={watch(`items.${index}.warehouse`) ?? ""}
                    onChange={(v) =>
                      setValue(`items.${index}.warehouse`, v, { shouldValidate: true })
                    }
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <span className="text-xs text-muted-foreground">Qty</span>}
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    {...register(`items.${index}.qty`, { valueAsNumber: true })}
                    onChange={(e) => {
                      register(`items.${index}.qty`, { valueAsNumber: true }).onChange(e);
                      setTimeout(() => recalcRow(index), 0);
                    }}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <span className="text-xs text-muted-foreground">Rate</span>}
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    {...register(`items.${index}.rate`, { valueAsNumber: true })}
                    onChange={(e) => {
                      register(`items.${index}.rate`, { valueAsNumber: true }).onChange(e);
                      setTimeout(() => recalcRow(index), 0);
                    }}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex items-end gap-1">
                  <div className="flex-1 space-y-1">
                    {index === 0 && (
                      <span className="text-xs text-muted-foreground">{t("amount")}</span>
                    )}
                    <Input
                      type="number"
                      readOnly
                      tabIndex={-1}
                      {...register(`items.${index}.amount`, { valueAsNumber: true })}
                      className="bg-muted/50"
                    />
                  </div>
                  {!isReadOnly && fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ item_code: "", qty: 1, rate: 0, amount: 0, warehouse: "" })}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("addItem")}
            </Button>
          )}
        </div>

        {errors.items && (
          <p className="text-sm text-destructive">
            {typeof errors.items.message === "string" ? errors.items.message : t("addItem")}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {isEdit && docstatus === 1 && defaultValues && (
            <Button type="button" variant="outline" asChild>
              <a href={`/sales-invoices/new?from_dn=${encodeURIComponent(defaultValues.name)}`}>
                <FileText className="h-4 w-4 mr-1.5" />
                {t("createInvoice")}
              </a>
            </Button>
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
