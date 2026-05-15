"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkField } from "@/components/shared/link-field";
import { usePriceList, useCreatePriceList, useUpdatePriceList } from "@/hooks/use-price-lists";
import { priceListSchema, type PriceListFormValues } from "@/lib/schemas/price-list-schema";

interface PriceListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editName?: string | null;
  onSuccess?: (name: string) => void;
}

export function PriceListFormDialog({
  open,
  onOpenChange,
  editName,
  onSuccess,
}: PriceListFormDialogProps) {
  const t = useTranslations("priceLists");
  const isEdit = !!editName;

  const { data: existing, isLoading } = usePriceList(editName ?? "");
  const create = useCreatePriceList();
  const update = useUpdatePriceList();
  const isPending = create.isPending || update.isPending;

  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: {
      price_list_name: "",
      currency: "",
      selling: true,
      buying: false,
      enabled: true,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  // Reset form when dialog opens or existing data loads
  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        price_list_name: existing.price_list_name,
        currency: existing.currency,
        selling: !!existing.selling,
        buying: !!existing.buying,
        enabled: !!existing.enabled,
      });
    } else if (!isEdit) {
      reset({
        price_list_name: "",
        currency: "",
        selling: true,
        buying: false,
        enabled: true,
      });
    }
  }, [open, isEdit, existing, reset]);

  function onSubmit(data: PriceListFormValues) {
    if (isEdit && editName) {
      update.mutate(
        { name: editName, data },
        {
          onSuccess: () => {
            toast.success(t("updateSuccess"));
            onOpenChange(false);
            onSuccess?.(editName);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      create.mutate(data, {
        onSuccess: (doc) => {
          toast.success(t("createSuccess"));
          onOpenChange(false);
          onSuccess?.(doc.name);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editPriceList") : t("newPriceList")}</DialogTitle>
          <DialogDescription>{isEdit ? t("editPriceList") : t("newPriceList")}</DialogDescription>
        </DialogHeader>

        {isEdit && isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Price List Name */}
            <div className="space-y-2">
              <Label>{t("priceListName")}</Label>
              <Input {...register("price_list_name")} />
              {errors.price_list_name && (
                <p className="text-sm text-destructive">{errors.price_list_name.message}</p>
              )}
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <LinkField
                doctype="Currency"
                value={watch("currency")}
                onChange={(v) => setValue("currency", v, { shouldValidate: true })}
                placeholder={t("currency")}
              />
              {errors.currency && (
                <p className="text-sm text-destructive">{errors.currency.message}</p>
              )}
            </div>

            {/* Selling / Buying / Enabled switches */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={watch("selling")}
                  onCheckedChange={(v) => setValue("selling", v)}
                />
                <Label>{t("selling")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={watch("buying")} onCheckedChange={(v) => setValue("buying", v)} />
                <Label>{t("buying")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={watch("enabled")}
                  onCheckedChange={(v) => setValue("enabled", v)}
                />
                <Label>{t("enabled")}</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("saving") : isEdit ? t("update") : t("create")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
