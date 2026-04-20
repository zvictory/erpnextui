"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Printer, RotateCcw, FileText, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { TaxSection } from "@/components/shared/tax-section";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import {
  salesInvoiceSchema,
  type SalesInvoiceFormValues,
  type SalesInvoiceSubmitValues,
} from "@/lib/schemas/sales-invoice-schema";
import type { SalesInvoice } from "@/types/sales-invoice";
import type { TaxRow } from "@/types/tax";
import { useCompanyStore } from "@/stores/company-store";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanies } from "@/hooks/use-companies";
import { useCustomer } from "@/hooks/use-customers";
import { useSellingPriceList, useSellingPriceLists } from "@/hooks/use-selling-price-list";

interface SalesInvoiceFormProps {
  defaultValues?: SalesInvoice;
  onSubmit: (data: SalesInvoiceSubmitValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onSubmitDoc?: () => void;
  onCancelDoc?: () => void;
  isSubmittingDoc?: boolean;
  isCancellingDoc?: boolean;
  onCreateReturn?: () => void;
  returnLabel?: string;
  onPrintReceipt?: () => void;
  onPrintYukXati?: () => void;
  onReceivePayment?: () => void;
}

export function SalesInvoiceForm({
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
  onPrintReceipt,
  onPrintYukXati,
  onReceivePayment,
}: SalesInvoiceFormProps) {
  const t = useTranslations("invoices");
  const docstatus = defaultValues?.docstatus ?? 0;
  const isReadOnly = docstatus > 0;

  const {
    company,
    currencySymbol: companyCurrencySymbol,
    symbolOnRight: companySymbolOnRight,
    currencyCode: companyCurrencyCode,
  } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const sellingWarehouse = useUISettingsStore(
    (s) => s.getCompanySettings(company).sellingWarehouse,
  );
  const { data: companiesList } = useCompanies();
  const companyDefaultCurrency = companiesList?.find((c) => c.name === company)?.default_currency;

  const { data: defaultPriceList } = useSellingPriceList(company);
  const { data: priceLists } = useSellingPriceLists();
  const [selectedPriceList, setSelectedPriceList] = useState("");
  const [taxTemplate, setTaxTemplate] = useState(
    ((defaultValues as unknown as Record<string, unknown>)?.taxes_and_charges as string) ?? "",
  );
  const [taxes, setTaxes] = useState<TaxRow[]>([]);

  // Initialize price list from company default once loaded
  useEffect(() => {
    if (defaultPriceList && !selectedPriceList) {
      setSelectedPriceList(defaultPriceList);
    }
  }, [defaultPriceList, selectedPriceList]);

  const form = useForm<SalesInvoiceFormValues>({
    resolver: zodResolver(salesInvoiceSchema),
    mode: "onChange",
    defaultValues: defaultValues
      ? (() => {
          // If ERPNext has an invoice-level discount, show it as per-item discount_percentage
          const _invoiceDiscPct = (defaultValues as Record<string, unknown>)
            .additional_discount_percentage as number | undefined;
          return {
            customer: defaultValues.customer,
            posting_date: defaultValues.posting_date,
            due_date: defaultValues.due_date ?? defaultValues.posting_date,
            items: defaultValues.items.map((item) => {
              // Use price_list_rate as display rate so per-item discount is visible
              const plr = (item as Record<string, unknown>).price_list_rate as number | undefined;
              const displayRate = plr && plr > 0 ? plr : item.rate;
              return {
                item_code: item.item_code,
                qty: item.qty,
                rate: displayRate,
                amount: item.amount,
                uom: item.uom,
                discount_percentage: item.discount_percentage || 0,
                discount_amount: item.discount_amount || 0,
              };
            }),
          };
        })()
      : (() => {
          const today = new Date().toISOString().slice(0, 10);
          const emptyItem = { item_code: "", qty: 1, rate: 0, amount: 0, uom: "" };
          return {
            customer: "",
            posting_date: today,
            due_date: today,
            items: [{ ...emptyItem }, { ...emptyItem }, { ...emptyItem }],
          };
        })(),
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = form;

  const postingDate = watch("posting_date");
  const dueDate = watch("due_date");
  const watchedCustomer = watch("customer");
  // useWatch triggers re-render on deep field changes (unlike watch)
  const items = useWatch({ control: form.control, name: "items" });

  // Fetch customer doc to get their default_currency
  const { data: customerDoc } = useCustomer(watchedCustomer);
  // For drafts: customer currency wins (user may have changed customer, or initial save raced).
  // For submitted/cancelled: respect the saved currency (historical record).
  const effectiveCurrency =
    docstatus > 0
      ? defaultValues?.currency ||
        customerDoc?.default_currency ||
        companyDefaultCurrency ||
        companyCurrencyCode
      : customerDoc?.default_currency ||
        defaultValues?.currency ||
        companyDefaultCurrency ||
        companyCurrencyCode;
  const currInfo =
    typeof effectiveCurrency === "string" ? currencyMap?.get(effectiveCurrency) : undefined;
  const currencySymbol = currInfo?.symbol ?? companyCurrencySymbol;
  const symbolOnRight = currInfo?.onRight ?? companySymbolOnRight;

  // Compute subtotal directly — no useMemo (items reference doesn't change on field updates)
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  useEffect(() => {
    if (postingDate && dueDate && dueDate < postingDate) {
      setValue("due_date", postingDate, { shouldValidate: true });
    }
  }, [postingDate, dueDate, setValue]);

  function handleFormSubmit(data: SalesInvoiceFormValues) {
    const submitData: SalesInvoiceSubmitValues & Record<string, unknown> = {
      customer: data.customer,
      posting_date: data.posting_date,
      due_date: data.due_date,
      currency: effectiveCurrency,
      // Send price_list_rate + discount — let ERPNext calculate rate and amount
      items: data.items.map((item) => ({
        item_code: item.item_code,
        qty: item.qty,
        uom: item.uom,
        conversion_factor: item.conversion_factor,
        price_list_rate: item.rate,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: item.discount_amount || 0,
      })),
    };
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
    onSubmit(submitData as SalesInvoiceSubmitValues);
  }

  const priceListOptions = priceLists?.map((pl) => pl.name) ?? [];

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
            <div className="flex items-center gap-2">
              <Label>
                {t("customer")} <span className="text-destructive">*</span>
              </Label>
              {effectiveCurrency && (
                <Badge variant="outline" className="text-xs py-0 h-4 font-mono">
                  {effectiveCurrency}
                </Badge>
              )}
            </div>
            <LinkField
              doctype="Customer"
              descriptionField="customer_name"
              value={watch("customer")}
              onChange={(v) => setValue("customer", v, { shouldValidate: true })}
              disabled={isReadOnly}
              displayValue={customerDoc?.customer_name}
            />
            {errors.customer && (
              <p className="text-sm text-destructive">{errors.customer.message}</p>
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
          <div className="space-y-1.5">
            <Label htmlFor="due_date">
              {t("dueDate")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="due_date"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  id="due_date"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  min={watch("posting_date")}
                  disabled={isReadOnly}
                />
              )}
            />
            {errors.due_date && (
              <p className="text-sm text-destructive">{errors.due_date.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t("priceList")}</Label>
            <Select
              value={selectedPriceList}
              onValueChange={setSelectedPriceList}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectPriceList")} />
              </SelectTrigger>
              <SelectContent>
                {priceListOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <InvoiceItemsEditor
          disabled={isReadOnly}
          fieldPrefix="items"
          priceList={selectedPriceList}
          currencySymbol={currencySymbol}
          symbolOnRight={symbolOnRight}
          showStockAvailability={!isReadOnly}
          sellingWarehouse={sellingWarehouse}
        />

        {errors.items && (
          <p className="text-sm text-destructive">
            {typeof errors.items.message === "string" ? errors.items.message : t("pleaseAddItem")}
          </p>
        )}

        <TaxSection
          taxTemplateDoctype="Sales Taxes and Charges Template"
          selectedTemplate={taxTemplate}
          onTemplateChange={setTaxTemplate}
          taxes={taxes}
          onTaxesChange={setTaxes}
          subtotal={subtotal}
          isEditable={!isReadOnly}
          invoiceDiscountAmount={Number(
            (defaultValues as Record<string, unknown> | undefined)?.discount_amount ?? 0,
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          {isEdit && onPrintReceipt && (
            <Button type="button" variant="outline" onClick={onPrintReceipt}>
              <Printer className="h-4 w-4 mr-1.5" />
              Chek chop etish
            </Button>
          )}
          {isEdit && onPrintYukXati && (
            <Button type="button" variant="outline" onClick={onPrintYukXati}>
              <FileText className="h-4 w-4 mr-1.5" />
              Yuk xati
            </Button>
          )}
          {isEdit && onReceivePayment && (
            <Button type="button" variant="default" onClick={onReceivePayment}>
              <CreditCard className="h-4 w-4 mr-1.5" />
              {t("receivePayment")}
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
                href={`/sales-invoices/new?amend_from=${encodeURIComponent(defaultValues?.name ?? "")}`}
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
