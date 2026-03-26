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
import { customerSchema, type CustomerFormValues } from "@/lib/schemas/customer-schema";
import type { Customer } from "@/types/customer";

interface CustomerFormProps {
  defaultValues?: Customer;
  onSubmit: (data: CustomerFormValues) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit = false,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues
      ? {
          customer_name: defaultValues.customer_name,
          customer_type: defaultValues.customer_type,
          customer_group: defaultValues.customer_group ?? "",
          territory: defaultValues.territory ?? "",
          default_currency: defaultValues.default_currency ?? "",
          tax_id: defaultValues.tax_id ?? "",
          email_id: defaultValues.email_id ?? "",
          mobile_no: defaultValues.mobile_no ?? "",
        }
      : {
          customer_name: "",
          customer_type: "Company",
          customer_group: "",
          territory: "",
          default_currency: "",
          tax_id: "",
          email_id: "",
          mobile_no: "",
        },
  });

  const t = useTranslations("customers");

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
          <Label htmlFor="customer_name">
            {t("customerName")} <span className="text-destructive">*</span>
          </Label>
          <Input id="customer_name" {...register("customer_name")} />
          {errors.customer_name && (
            <p className="text-sm text-destructive">{errors.customer_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t("type")}</Label>
          <Select
            value={watch("customer_type")}
            onValueChange={(v) => setValue("customer_type", v as "Company" | "Individual")}
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
          <Label>{t("customerGroup")}</Label>
          <LinkField
            doctype="Customer Group"
            value={watch("customer_group") ?? ""}
            onChange={(v) => setValue("customer_group", v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("territory")}</Label>
          <LinkField
            doctype="Territory"
            value={watch("territory") ?? ""}
            onChange={(v) => setValue("territory", v)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("currency")}</Label>
          <LinkField
            doctype="Currency"
            value={watch("default_currency") ?? ""}
            onChange={(v) => setValue("default_currency", v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tax_id">{t("taxId")}</Label>
          <Input id="tax_id" {...register("tax_id")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email_id">{t("email")}</Label>
          <Input id="email_id" type="email" {...register("email_id")} />
          {errors.email_id && <p className="text-sm text-destructive">{errors.email_id.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mobile_no">{t("mobile")}</Label>
          <Input id="mobile_no" {...register("mobile_no")} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : isEdit ? t("update") : t("create")}
        </Button>
      </div>
    </form>
  );
}
