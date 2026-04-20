"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/shared/date-input";
import type { AssetFormValues, Asset } from "@/types/asset";

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  category: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  supplier: z.string().optional(),
  purchaseCost: z.coerce.number().min(0, "Must be >= 0"),
  location: z.string().optional(),
  workstation: z.string().optional(),
  powerKw: z.coerce.number().min(0).optional(),
  capacity: z.string().optional(),
  usefulLifeYears: z.coerce.number().min(1, "Must be >= 1"),
  salvageValue: z.coerce.number().min(0).optional(),
  depreciationMethod: z.enum(["straight_line", "declining_balance"]),
  warrantyUntil: z.string().optional(),
  status: z.enum(["operational", "maintenance", "broken", "retired"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof assetSchema>;

interface AssetFormProps {
  defaultValues?: Asset;
  onSubmit: (data: AssetFormValues) => void;
  isSubmitting: boolean;
}

const CATEGORIES = [
  "Mixer",
  "Freezer",
  "Pump",
  "Packing",
  "Pasteurizer",
  "Tunnel",
  "Conveyor",
  "Tank",
  "Other",
];

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AssetForm({ defaultValues, onSubmit, isSubmitting }: AssetFormProps) {
  const t = useTranslations("assets");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(assetSchema) as never,
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          model: defaultValues.model ?? "",
          serialNumber: defaultValues.serialNumber ?? "",
          category: defaultValues.category ?? "",
          purchaseDate: defaultValues.purchaseDate,
          supplier: defaultValues.supplier ?? "",
          purchaseCost: defaultValues.purchaseCost,
          location: defaultValues.location ?? "",
          workstation: defaultValues.workstation ?? "",
          powerKw: defaultValues.powerKw ?? undefined,
          capacity: defaultValues.capacity ?? "",
          usefulLifeYears: defaultValues.usefulLifeYears,
          salvageValue: defaultValues.salvageValue ?? 0,
          depreciationMethod:
            (defaultValues.depreciationMethod as "straight_line" | "declining_balance") ??
            "straight_line",
          warrantyUntil: defaultValues.warrantyUntil ?? "",
          status:
            (defaultValues.status as "operational" | "maintenance" | "broken" | "retired") ??
            "operational",
          notes: defaultValues.notes ?? "",
        }
      : {
          name: "",
          purchaseDate: getToday(),
          purchaseCost: 0,
          usefulLifeYears: 10,
          salvageValue: 0,
          depreciationMethod: "straight_line",
          status: "operational",
        },
  });

  function handleFormSubmit(data: FormValues) {
    onSubmit({
      ...data,
      depreciationMethod: data.depreciationMethod,
      status: data.status,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            {t("assetName")} <span className="text-destructive">*</span>
          </Label>
          <Input {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t("category")}</Label>
          <Select value={watch("category") ?? ""} onValueChange={(v) => setValue("category", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t("model")}</Label>
          <Input {...register("model")} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("serialNumber")}</Label>
          <Input {...register("serialNumber")} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("assetStatus")}</Label>
          <Select
            value={watch("status")}
            onValueChange={(v) =>
              setValue("status", v as "operational" | "maintenance" | "broken" | "retired")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operational">{t("status.operational")}</SelectItem>
              <SelectItem value="maintenance">{t("status.maintenance")}</SelectItem>
              <SelectItem value="broken">{t("status.broken")}</SelectItem>
              <SelectItem value="retired">{t("status.retired")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Purchase info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>
            {t("purchaseDate")} <span className="text-destructive">*</span>
          </Label>
          <DateInput
            value={watch("purchaseDate")}
            onChange={(e) => setValue("purchaseDate", e.target.value)}
          />
          {errors.purchaseDate && (
            <p className="text-sm text-destructive">{errors.purchaseDate.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>
            {t("purchaseCost")} <span className="text-destructive">*</span>
          </Label>
          <Input type="number" step="0.01" {...register("purchaseCost", { valueAsNumber: true })} />
          {errors.purchaseCost && (
            <p className="text-sm text-destructive">{errors.purchaseCost.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t("supplier")}</Label>
          <Input {...register("supplier")} />
        </div>
      </div>

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("location")}</Label>
          <Input {...register("location")} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("workstation")}</Label>
          <Input {...register("workstation")} />
        </div>
      </div>

      {/* Technical */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("powerKw")}</Label>
          <Input type="number" step="0.01" {...register("powerKw", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("capacity")}</Label>
          <Input {...register("capacity")} placeholder="200 L" />
        </div>
      </div>

      {/* Depreciation */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>
            {t("usefulLifeYears")} <span className="text-destructive">*</span>
          </Label>
          <Input type="number" {...register("usefulLifeYears", { valueAsNumber: true })} />
          {errors.usefulLifeYears && (
            <p className="text-sm text-destructive">{errors.usefulLifeYears.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t("salvageValue")}</Label>
          <Input type="number" step="0.01" {...register("salvageValue", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("depreciationMethod")}</Label>
          <Select
            value={watch("depreciationMethod")}
            onValueChange={(v) =>
              setValue("depreciationMethod", v as "straight_line" | "declining_balance")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="straight_line">{t("depMethod.straight_line")}</SelectItem>
              <SelectItem value="declining_balance">{t("depMethod.declining_balance")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Warranty */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("warrantyUntil")}</Label>
          <DateInput
            value={watch("warrantyUntil") ?? ""}
            onChange={(e) => setValue("warrantyUntil", e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>{t("notes")}</Label>
        <Textarea {...register("notes")} rows={3} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : defaultValues ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
