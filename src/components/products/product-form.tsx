"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LinkField } from "@/components/shared/link-field";
import { itemSchema, type ItemFormValues } from "@/lib/schemas/item-schema";
import type { Item } from "@/types/item";

interface ProductFormProps {
  defaultValues?: Item;
  onSubmit: (data: ItemFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
}: ProductFormProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: defaultValues
      ? {
          item_code: defaultValues.item_code,
          item_name: defaultValues.item_name,
          item_group: defaultValues.item_group,
          stock_uom: defaultValues.stock_uom,
          standard_rate: defaultValues.standard_rate ?? 0,
          valuation_rate: defaultValues.valuation_rate ?? 0,
          is_stock_item: defaultValues.is_stock_item ?? 1,
          has_serial_no: defaultValues.has_serial_no ?? 0,
          disabled: defaultValues.disabled ?? 0,
        }
      : {
          item_code: "",
          item_name: "",
          item_group: "",
          stock_uom: "",
          standard_rate: 0,
          valuation_rate: 0,
          is_stock_item: 1,
          has_serial_no: 0,
          disabled: 0,
        },
  });

  const t = useTranslations("products");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="item_code">
            {t("itemCode")} <span className="text-destructive">*</span>
          </Label>
          <Input id="item_code" {...register("item_code")} disabled={isEdit} />
          {errors.item_code && (
            <p className="text-sm text-destructive">{errors.item_code.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item_name">
            {t("itemName")} <span className="text-destructive">*</span>
          </Label>
          <Input id="item_name" {...register("item_name")} />
          {errors.item_name && (
            <p className="text-sm text-destructive">{errors.item_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            {t("itemGroup")} <span className="text-destructive">*</span>
          </Label>
          <LinkField
            doctype="Item Group"
            value={watch("item_group")}
            onChange={(v) => setValue("item_group", v, { shouldValidate: true })}
          />
          {errors.item_group && (
            <p className="text-sm text-destructive">{errors.item_group.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>
            {t("uom")} <span className="text-destructive">*</span>
          </Label>
          <LinkField
            doctype="UOM"
            value={watch("stock_uom")}
            onChange={(v) => setValue("stock_uom", v, { shouldValidate: true })}
          />
          {errors.stock_uom && (
            <p className="text-sm text-destructive">{errors.stock_uom.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="standard_rate">{t("sellingRate")}</Label>
          <Input
            id="standard_rate"
            type="number"
            step="any"
            min={0}
            {...register("standard_rate", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valuation_rate">{t("valuationRate")}</Label>
          <Input
            id="valuation_rate"
            type="number"
            step="any"
            min={0}
            {...register("valuation_rate", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={watch("is_stock_item") === 1}
            onCheckedChange={(checked) => setValue("is_stock_item", checked ? 1 : 0)}
          />
          <span className="text-sm">{t("maintainStock")}</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={watch("has_serial_no") === 1}
            onCheckedChange={(checked) => setValue("has_serial_no", checked ? 1 : 0)}
          />
          <span className="text-sm">{t("trackSerialNumbers")}</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={watch("disabled") === 1}
            onCheckedChange={(checked) => setValue("disabled", checked ? 1 : 0)}
          />
          <span className="text-sm">{t("disabled")}</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : isEdit ? t("update") : t("create")}
        </Button>
      </div>
    </form>
  );
}
