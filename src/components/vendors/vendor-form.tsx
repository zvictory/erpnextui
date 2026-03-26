"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LinkField } from "@/components/shared/link-field";
import { supplierSchema, type SupplierFormValues } from "@/lib/schemas/supplier-schema";
import type { Supplier } from "@/types/supplier";

interface VendorFormProps {
  defaultValues?: Supplier;
  onSubmit: (data: SupplierFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
}

export function VendorForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
}: VendorFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultValues
      ? {
          supplier_name: defaultValues.supplier_name,
          supplier_type: defaultValues.supplier_type,
          supplier_group: defaultValues.supplier_group ?? "",
          default_currency: defaultValues.default_currency ?? "",
          tax_id: defaultValues.tax_id ?? "",
          email_id: defaultValues.email_id ?? "",
          mobile_no: defaultValues.mobile_no ?? "",
        }
      : {
          supplier_name: "",
          supplier_type: "Company",
          supplier_group: "",
          default_currency: "",
          tax_id: "",
          email_id: "",
          mobile_no: "",
        },
  });

  const t = useTranslations("vendors");

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
          <Label htmlFor="supplier_name">
            {t("supplierName")} <span className="text-destructive">*</span>
          </Label>
          <Input id="supplier_name" {...register("supplier_name")} />
          {errors.supplier_name && (
            <p className="text-sm text-destructive">{errors.supplier_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t("type")}</Label>
          <Select
            value={watch("supplier_type")}
            onValueChange={(v) => setValue("supplier_type", v as "Company" | "Individual")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Company">{t("company")}</SelectItem>
              <SelectItem value="Individual">{t("individual")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("supplierGroup")}</Label>
          <LinkField
            doctype="Supplier Group"
            value={watch("supplier_group") ?? ""}
            onChange={(v) => setValue("supplier_group", v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("currency")}</Label>
          <LinkField
            doctype="Currency"
            value={watch("default_currency") ?? ""}
            onChange={(v) => setValue("default_currency", v)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tax_id">{t("taxId")}</Label>
          <Input id="tax_id" {...register("tax_id")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email_id">{t("email")}</Label>
          <Input id="email_id" type="email" {...register("email_id")} />
          {errors.email_id && <p className="text-sm text-destructive">{errors.email_id.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mobile_no">{t("mobile")}</Label>
        <Input id="mobile_no" {...register("mobile_no")} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : isEdit ? t("update") : t("create")}
        </Button>
      </div>
    </form>
  );
}
