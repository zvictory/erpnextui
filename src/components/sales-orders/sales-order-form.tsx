"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { DateInput } from "@/components/shared/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LinkField } from "@/components/shared/link-field";
import { InvoiceItemsEditor } from "@/components/shared/invoice-items-editor";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import {
  salesOrderSchema,
  type SalesOrderFormValues,
  type SalesOrderSubmitValues,
} from "@/lib/schemas/sales-order-schema";
import type { SalesOrder } from "@/types/sales-order";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanies } from "@/hooks/use-companies";
import { useCustomer } from "@/hooks/use-customers";
import { useSellingPriceList, useSellingPriceLists } from "@/hooks/use-selling-price-list";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface SalesOrderFormProps {
  defaultValues?: SalesOrder;
  onSubmit: (data: SalesOrderSubmitValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onSubmitDoc?: () => void;
  onCancelDoc?: () => void;
  isSubmittingDoc?: boolean;
  isCancellingDoc?: boolean;
}

export function SalesOrderForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onSubmitDoc,
  onCancelDoc,
  isSubmittingDoc = false,
  isCancellingDoc = false,
}: SalesOrderFormProps) {
  const t = useTranslations("orders");
  const tInvoices = useTranslations("invoices");
  const docstatus = defaultValues?.docstatus ?? 0;
  const isReadOnly = docstatus > 0;

  const {
    company,
    currencySymbol: companyCurrencySymbol,
    symbolOnRight: companySymbolOnRight,
    currencyCode: companyCurrencyCode,
  } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { data: companiesList } = useCompanies();
  const companyDefaultCurrency = companiesList?.find((c) => c.name === company)?.default_currency;

  const { data: defaultPriceList } = useSellingPriceList(company);
  const { data: priceLists } = useSellingPriceLists();
  const [selectedPriceList, setSelectedPriceList] = useState("");

  useEffect(() => {
    if (defaultPriceList && !selectedPriceList) {
      setSelectedPriceList(defaultPriceList);
    }
  }, [defaultPriceList, selectedPriceList]);

  const form = useForm<SalesOrderFormValues>({
    mode: "onChange",
    resolver: zodResolver(salesOrderSchema),
    defaultValues: defaultValues
      ? {
          customer: defaultValues.customer,
          transaction_date: defaultValues.transaction_date,
          delivery_date: defaultValues.delivery_date ?? defaultValues.transaction_date,
          items: defaultValues.items.map((item) => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
            uom: (item as Record<string, unknown>).uom as string | undefined,
            discount_percentage: (item as Record<string, unknown>).discount_percentage as number | undefined,
            discount_amount: (item as Record<string, unknown>).discount_amount as number | undefined,
          })),
        }
      : {
          customer: "",
          transaction_date: getToday(),
          delivery_date: getToday(),
          items: [{ item_code: "", qty: 1, rate: 0, amount: 0, uom: "" }],
        },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = form;

  const transactionDate = watch("transaction_date");
  const deliveryDate = watch("delivery_date");
  const watchedCustomer = watch("customer");

  const { data: customerDoc } = useCustomer(watchedCustomer);
  const effectiveCurrency =
    docstatus > 0
      ? defaultValues?.currency || customerDoc?.default_currency || companyDefaultCurrency || companyCurrencyCode
      : customerDoc?.default_currency || defaultValues?.currency || companyDefaultCurrency || companyCurrencyCode;
  const currInfo = typeof effectiveCurrency === "string" ? currencyMap?.get(effectiveCurrency) : undefined;
  const currencySymbol = currInfo?.symbol ?? companyCurrencySymbol;
  const symbolOnRight = currInfo?.onRight ?? companySymbolOnRight;

  function handleFormSubmit(data: SalesOrderFormValues) {
    onSubmit({ ...data, currency: typeof effectiveCurrency === "string" ? effectiveCurrency : undefined });
  }

  useEffect(() => {
    if (transactionDate && deliveryDate && deliveryDate < transactionDate) {
      setValue("delivery_date", transactionDate, { shouldValidate: true });
    }
  }, [transactionDate, deliveryDate, setValue]);

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
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
              value={watch("customer")}
              onChange={(v) => setValue("customer", v, { shouldValidate: true })}
              disabled={isReadOnly}
            />
            {errors.customer && (
              <p className="text-sm text-destructive">{errors.customer.message}</p>
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
          <div className="space-y-1.5">
            <Label htmlFor="delivery_date">
              {t("deliveryDate")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="delivery_date"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  id="delivery_date"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  min={watch("transaction_date")}
                  disabled={isReadOnly}
                />
              )}
            />
            {errors.delivery_date && (
              <p className="text-sm text-destructive">{errors.delivery_date.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{tInvoices("priceList")}</Label>
            <Select
              value={selectedPriceList}
              onValueChange={setSelectedPriceList}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder={tInvoices("selectPriceList")} />
              </SelectTrigger>
              <SelectContent>
                {(priceLists ?? []).map((pl) => (
                  <SelectItem key={pl.name} value={pl.name}>
                    {pl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <InvoiceItemsEditor
          disabled={isReadOnly}
          priceList={selectedPriceList}
          currencySymbol={currencySymbol}
          symbolOnRight={symbolOnRight}
        />

        {errors.items && (
          <p className="text-sm text-destructive">
            {typeof errors.items.message === "string" ? errors.items.message : t("addItem")}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {isEdit && docstatus === 1 && defaultValues && (
            <Button type="button" variant="outline" asChild>
              <a href={`/sales-invoices/new?from_so=${encodeURIComponent(defaultValues.name)}`}>
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
                href={`/sales-orders/new?amend_from=${encodeURIComponent(defaultValues?.name ?? "")}`}
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
