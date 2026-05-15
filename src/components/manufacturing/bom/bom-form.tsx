"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkField } from "@/components/shared/link-field";
import { BomMaterialsTable } from "@/components/manufacturing/bom/bom-materials-table";
import { BomOperationsTable } from "@/components/manufacturing/bom/bom-operations-table";
import { BomCostSummary } from "@/components/manufacturing/bom/bom-cost-summary";
import { bomSchema, type BOMFormValues } from "@/lib/schemas/manufacturing-schemas";
import type { BOM } from "@/types/manufacturing";

interface BomFormProps {
  defaultValues?: BOM;
  onSubmit: (data: BOMFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
}

export function BomForm({ defaultValues, onSubmit, isSubmitting, isEdit }: BomFormProps) {
  const t = useTranslations("mfg.bom");

  const form = useForm<BOMFormValues>({
    resolver: zodResolver(bomSchema) as Resolver<BOMFormValues>,
    defaultValues: defaultValues
      ? {
          item: defaultValues.item,
          quantity: defaultValues.quantity,
          items: defaultValues.items.map((item) => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: item.rate,
            stock_uom: item.stock_uom,
            source_warehouse: item.source_warehouse,
          })),
          operations: defaultValues.operations?.map((op) => ({
            operation: op.operation,
            workstation: op.workstation,
            time_in_mins: op.time_in_mins,
            batch_size: op.batch_size,
          })),
        }
      : {
          item: "",
          quantity: 1,
          items: [{ item_code: "", qty: 1, rate: 0, stock_uom: "", source_warehouse: "" }],
          operations: [],
        },
  });

  const {
    register,
    control,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const watchedItems = watch("items") ?? [];
  const watchedOperations = watch("operations") ?? [];

  const materialCost = watchedItems.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0,
  );

  const operatingCost = watchedOperations.reduce((sum, op) => {
    const time = Number(op.time_in_mins) || 0;
    const hourRate = (op as Record<string, unknown>).hour_rate
      ? Number((op as Record<string, unknown>).hour_rate)
      : 0;
    return sum + (time / 60) * hourRate;
  }, 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Header: Item + Quantity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("item")}</Label>
          <LinkField
            doctype="Item"
            value={watch("item")}
            onChange={(val) => setValue("item", val, { shouldValidate: true })}
            placeholder={`${t("item")}...`}
            descriptionField="item_name"
            showValueWithDescription
          />
          {errors.item && <p className="text-sm text-destructive">{errors.item.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("quantity")}</Label>
          <Input type="number" min={1} {...register("quantity")} />
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
        </div>
      </div>

      {/* Materials */}
      <BomMaterialsTable control={control} register={register} watch={watch} setValue={setValue} />

      {/* Operations */}
      <BomOperationsTable control={control} register={register} watch={watch} setValue={setValue} />

      {/* Cost Summary */}
      <BomCostSummary materialCost={materialCost} operatingCost={operatingCost} />

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          <Save className="mr-1 h-4 w-4" />
          {isEdit ? t("title") : t("new")}
        </Button>
      </div>
    </form>
  );
}
