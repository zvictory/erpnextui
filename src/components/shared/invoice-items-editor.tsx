"use client";

import { useEffect, useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LinkField } from "@/components/shared/link-field";
import { formatCurrency } from "@/lib/utils";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap, useExpenseAccountsWithCurrency } from "@/hooks/use-accounts";
import { useCompanies } from "@/hooks/use-companies";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { useItem } from "@/hooks/use-items";
import { useItemPrice } from "@/hooks/use-item-price";
import { StockAvailabilityIndicator } from "@/components/shared/stock-availability-indicator";
import { useTranslations } from "next-intl";

interface InvoiceItemsEditorProps {
  disabled?: boolean;
  /** Field path prefix for useFieldArray. Default "items" (purchase invoices). */
  fieldPrefix?: string;
  /** Hide the total row (when parent renders its own total). */
  hideTotal?: boolean;
  /** Selling price list name for rate lookup. */
  priceList?: string;
  /** Override currency symbol (defaults to company currency). */
  currencySymbol?: string;
  /** Override symbol position (defaults to company setting). */
  symbolOnRight?: boolean;
  /** Show "+ Add Service Line" for account-based lines (no Item master). */
  allowServiceLines?: boolean;
  /** Show per-item stock availability below the item selector (selling contexts only). */
  showStockAvailability?: boolean;
}

function buildGridTemplate(showUom: boolean, showDiscPct: boolean, showDiscAmt: boolean): string {
  const cols = ["1fr"]; // Item
  if (showUom) cols.push("120px");
  cols.push("80px"); // Qty
  cols.push("100px"); // Rate
  if (showDiscPct) cols.push("80px");
  if (showDiscAmt) cols.push("90px");
  cols.push("100px"); // Amount
  cols.push("40px"); // Actions
  return cols.join(" ");
}

function ItemRow({
  index,
  disabled,
  prefix,
  priceList,
  showUom,
  showDiscPct,
  showDiscAmt,
  showStockAvailability,
  onRemove,
}: {
  index: number;
  disabled: boolean;
  prefix: string;
  priceList: string;
  showUom: boolean;
  showDiscPct: boolean;
  showDiscAmt: boolean;
  showStockAvailability: boolean;
  onRemove?: () => void;
}) {
  const t = useTranslations("invoices");
  const { register, control, setValue } = useFormContext();
  const qty = useWatch({ control, name: `${prefix}.${index}.qty` });
  const rate = useWatch({ control, name: `${prefix}.${index}.rate` });
  const discPct = useWatch({ control, name: `${prefix}.${index}.discount_percentage` }) ?? 0;
  const discAmt = useWatch({ control, name: `${prefix}.${index}.discount_amount` }) ?? 0;
  const itemCode = useWatch({ control, name: `${prefix}.${index}.item_code` });
  const uom = useWatch({ control, name: `${prefix}.${index}.uom` }) ?? "";
  const prevItemRef = useRef<string>(itemCode ?? "");
  const prevUomRef = useRef<string>(uom);

  const { data: itemDoc } = useItem(itemCode ?? "");
  const { data: priceListRate } = useItemPrice(itemCode ?? "", priceList, uom);

  const uomOptions = itemDoc?.uoms?.length
    ? itemDoc.uoms.map((u) => u.uom)
    : itemDoc?.stock_uom
      ? [itemDoc.stock_uom]
      : [];

  // Look up conversion factor for current UOM
  const getConversionFactor = (targetUom: string) => {
    if (!itemDoc?.uoms?.length) return 1;
    const match = itemDoc.uoms.find((u) => u.uom === targetUom);
    return match?.conversion_factor ?? 1;
  };

  // When item changes: set UOM to stock_uom
  useEffect(() => {
    if (!itemCode || itemCode === prevItemRef.current || !itemDoc) return;

    prevItemRef.current = itemCode;
    prevUomRef.current = itemDoc.stock_uom ?? "";

    setValue(`${prefix}.${index}.uom`, itemDoc.stock_uom ?? "", {
      shouldValidate: true,
    });
    setValue(`${prefix}.${index}.conversion_factor`, getConversionFactor(itemDoc.stock_uom ?? ""));
  }, [itemCode, itemDoc, index, prefix, setValue]);

  // When price list rate resolves or UOM changes: set rate
  const prevRateRef = useRef<number | null>(parseFloat(rate) || null);
  useEffect(() => {
    if (!itemCode || !itemDoc) return;
    const newRate = priceListRate ?? itemDoc.standard_rate ?? 0;
    if (newRate === prevRateRef.current) return;
    // Don't overwrite an existing rate with 0 from item master (protects edit mode)
    if (prevRateRef.current !== null && newRate === 0) return;
    prevRateRef.current = newRate;
    setValue(`${prefix}.${index}.rate`, newRate, { shouldValidate: true });
  }, [priceListRate, itemDoc, itemCode, uom, index, prefix, setValue]);

  // Calculate amount (factoring in discounts)
  useEffect(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    const dp = parseFloat(discPct) || 0;
    const da = parseFloat(discAmt) || 0;
    let effective = r;
    if (dp > 0) effective = r * (1 - dp / 100);
    else if (da > 0) effective = r - da;
    setValue(`${prefix}.${index}.amount`, q * Math.max(effective, 0));
  }, [qty, rate, discPct, discAmt, index, prefix, setValue]);

  const gridTemplate = buildGridTemplate(showUom, showDiscPct, showDiscAmt);

  return (
    <div className="grid items-start gap-2 min-w-0" style={{ gridTemplateColumns: gridTemplate }}>
      <div className="space-y-1 min-w-0">
        {index === 0 && <Label className="text-xs">{t("item")}</Label>}
        <LinkField
          doctype="Item"
          value={itemCode ?? ""}
          onChange={(v) => setValue(`${prefix}.${index}.item_code`, v)}
          placeholder="Select item..."
          disabled={disabled}
          descriptionField="item_name"
          displayValue={itemDoc?.item_name}
        />
        {showStockAvailability && itemCode && (
          <StockAvailabilityIndicator
            itemCode={itemCode}
            isStockItem={itemDoc?.is_stock_item === 1}
          />
        )}
      </div>
      {showUom && (
        <div className="space-y-1">
          {index === 0 && <Label className="text-xs">{t("uom")}</Label>}
          <Select
            value={uom}
            onValueChange={(v) => {
              setValue(`${prefix}.${index}.uom`, v, { shouldValidate: true });
              setValue(`${prefix}.${index}.conversion_factor`, getConversionFactor(v));
            }}
            disabled={disabled || uomOptions.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t("uom")} />
            </SelectTrigger>
            <SelectContent>
              {uomOptions.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs">{t("qty")}</Label>}
        <Input
          type="number"
          step="any"
          min={0}
          {...register(`${prefix}.${index}.qty`, { valueAsNumber: true })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs">{t("rate")}</Label>}
        <Input
          type="number"
          step="any"
          min={0}
          {...register(`${prefix}.${index}.rate`, { valueAsNumber: true })}
          disabled={disabled}
        />
      </div>
      {showDiscPct && (
        <div className="space-y-1">
          {index === 0 && <Label className="text-xs">%</Label>}
          <Input
            type="number"
            step="any"
            min={0}
            max={100}
            {...register(`${prefix}.${index}.discount_percentage`, { valueAsNumber: true })}
            disabled={disabled}
          />
        </div>
      )}
      {showDiscAmt && (
        <div className="space-y-1">
          {index === 0 && <Label className="text-xs">{t("discount")}</Label>}
          <Input
            type="number"
            step="any"
            min={0}
            {...register(`${prefix}.${index}.discount_amount`, { valueAsNumber: true })}
            disabled={disabled}
          />
        </div>
      )}
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs">{t("amount")}</Label>}
        <Input
          type="number"
          readOnly
          tabIndex={-1}
          {...register(`${prefix}.${index}.amount`, { valueAsNumber: true })}
          className="bg-muted"
        />
      </div>
      <div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            tabIndex={-1}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ServiceLineRow({
  index,
  disabled,
  prefix,
  onRemove,
}: {
  index: number;
  disabled: boolean;
  prefix: string;
  onRemove?: () => void;
}) {
  const t = useTranslations("invoices");
  const { register, control, setValue } = useFormContext();
  const { company } = useCompanyStore();
  const { data: expenseAccounts = [] } = useExpenseAccountsWithCurrency(company);
  const qty = useWatch({ control, name: `${prefix}.${index}.qty` });
  const rate = useWatch({ control, name: `${prefix}.${index}.rate` });
  const expenseAccount = useWatch({ control, name: `${prefix}.${index}.expense_account` }) ?? "";

  useEffect(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    setValue(`${prefix}.${index}.amount`, q * r);
  }, [qty, rate, index, prefix, setValue]);

  const gridTemplate = "1fr 1fr 80px 100px 100px 40px";

  return (
    <div className="grid items-start gap-2 min-w-0" style={{ gridTemplateColumns: gridTemplate }}>
      <div className="space-y-1 min-w-0">
        {index === 0 && <Label className="text-xs">{t("expenseAccount")}</Label>}
        <select
          value={expenseAccount}
          onChange={(e) =>
            setValue(`${prefix}.${index}.expense_account`, e.target.value, { shouldValidate: true })
          }
          disabled={disabled}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        >
          <option value="">{t("selectAccount")}</option>
          {expenseAccounts.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1 min-w-0">
        {index === 0 && <Label className="text-xs">{t("description")}</Label>}
        <Input
          {...register(`${prefix}.${index}.description`)}
          placeholder={t("serviceDescription")}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs">{t("qty")}</Label>}
        <Input
          type="number"
          step="any"
          min={0}
          {...register(`${prefix}.${index}.qty`, { valueAsNumber: true })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs">{t("rate")}</Label>}
        <Input
          type="number"
          step="any"
          min={0}
          {...register(`${prefix}.${index}.rate`, { valueAsNumber: true })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs">{t("amount")}</Label>}
        <Input
          type="number"
          readOnly
          tabIndex={-1}
          {...register(`${prefix}.${index}.amount`, { valueAsNumber: true })}
          className="bg-muted"
        />
      </div>
      <div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            tabIndex={-1}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function InvoiceItemsEditor({
  disabled = false,
  fieldPrefix = "items",
  hideTotal = false,
  priceList = "",
  currencySymbol: currencySymbolProp,
  symbolOnRight: symbolOnRightProp,
  allowServiceLines = false,
  showStockAvailability = false,
}: InvoiceItemsEditorProps) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: fieldPrefix });
  const items = useWatch({ control, name: fieldPrefix });
  const companyStore = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { data: companiesList } = useCompanies();
  const companyDefaultCurrency =
    companiesList?.find((c) => c.name === companyStore.company)?.default_currency;
  const effectiveCode = companyStore.currencyCode || companyDefaultCurrency;
  const mapInfo = effectiveCode ? currencyMap?.get(effectiveCode) : undefined;
  const currencySymbol = currencySymbolProp ?? mapInfo?.symbol ?? companyStore.currencySymbol;
  const symbolOnRight = symbolOnRightProp ?? mapInfo?.onRight ?? companyStore.symbolOnRight;

  const showUom = useUISettingsStore((s) => s.invoiceShowUom);
  const settingDiscPct = useUISettingsStore((s) => s.invoiceShowDiscountPercent);
  const settingDiscAmt = useUISettingsStore((s) => s.invoiceShowDiscountAmount);

  // Auto-show discount columns when any item already has a discount
  const hasAnyDiscPct = (items ?? []).some(
    (i: { discount_percentage?: number }) => (i?.discount_percentage ?? 0) > 0,
  );
  const hasAnyDiscAmt = (items ?? []).some(
    (i: { discount_amount?: number }) => (i?.discount_amount ?? 0) > 0,
  );
  const showDiscPct = settingDiscPct || hasAnyDiscPct;
  const showDiscAmt = settingDiscAmt || hasAnyDiscAmt;

  const total = (items ?? []).reduce(
    (sum: number, item: { amount?: number }) => sum + (item?.amount ?? 0),
    0,
  );

  const emptyItem = {
    item_code: "",
    qty: 1,
    rate: 0,
    amount: 0,
    uom: "",
    conversion_factor: 1,
    discount_percentage: 0,
    discount_amount: 0,
  };

  return (
    <div className="space-y-3">
      {fieldPrefix === "items" && <Label>{t("items")}</Label>}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="space-y-2 min-w-[480px]">
          {fields.map((field, index) => {
            const row = getValues(`${fieldPrefix}.${index}`);
            const isService = "description" in (row ?? {}) && !row?.item_code;
            return isService ? (
              <ServiceLineRow
                key={field.id}
                index={index}
                disabled={disabled}
                prefix={fieldPrefix}
                onRemove={!disabled && fields.length > 1 ? () => remove(index) : undefined}
              />
            ) : (
              <ItemRow
                key={field.id}
                index={index}
                disabled={disabled}
                prefix={fieldPrefix}
                priceList={priceList}
                showUom={showUom}
                showDiscPct={showDiscPct}
                showDiscAmt={showDiscAmt}
                showStockAvailability={showStockAvailability}
                onRemove={!disabled && fields.length > 1 ? () => remove(index) : undefined}
              />
            );
          })}
        </div>
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyItem)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("addItem")}
          </Button>
          {allowServiceLines && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  item_code: "",
                  expense_account: "",
                  description: "",
                  qty: 1,
                  rate: 0,
                  amount: 0,
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("addServiceLine")}
            </Button>
          )}
        </div>
      )}
      {!hideTotal && (
        <div className="flex justify-end border-t pt-3">
          <div className="text-sm font-medium">
            {t("total")}: {formatCurrency(total, currencySymbol, symbolOnRight)}
          </div>
        </div>
      )}
    </div>
  );
}
