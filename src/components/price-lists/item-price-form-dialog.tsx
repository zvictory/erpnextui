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
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { LinkField } from "@/components/shared/link-field";
import { useCreateItemPrice, useUpdateItemPrice } from "@/hooks/use-price-lists";
import { itemPriceSchema, type ItemPriceFormValues } from "@/lib/schemas/price-list-schema";
import type { ItemPrice, PriceListListItem } from "@/types/price-list";

interface ItemPriceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList: PriceListListItem;
  editItem?: ItemPrice | null;
  onSuccess?: () => void;
}

export function ItemPriceFormDialog({
  open,
  onOpenChange,
  priceList,
  editItem,
  onSuccess,
}: ItemPriceFormDialogProps) {
  const t = useTranslations("priceLists");
  const isEdit = !!editItem;

  const create = useCreateItemPrice();
  const update = useUpdateItemPrice();
  const isPending = create.isPending || update.isPending;

  const form = useForm<ItemPriceFormValues>({
    resolver: zodResolver(itemPriceSchema),
    defaultValues: {
      item_code: "",
      price_list_rate: 0,
      currency: priceList.currency,
      uom: "",
      min_qty: undefined,
      valid_from: "",
      valid_upto: "",
      customer: "",
      supplier: "",
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

  useEffect(() => {
    if (!open) return;
    if (isEdit && editItem) {
      reset({
        item_code: editItem.item_code,
        price_list_rate: editItem.price_list_rate,
        currency: editItem.currency,
        uom: editItem.uom || "",
        min_qty: editItem.min_qty,
        valid_from: editItem.valid_from || "",
        valid_upto: editItem.valid_upto || "",
        customer: editItem.customer || "",
        supplier: editItem.supplier || "",
      });
    } else if (!isEdit) {
      reset({
        item_code: "",
        price_list_rate: 0,
        currency: priceList.currency,
        uom: "",
        min_qty: undefined,
        valid_from: "",
        valid_upto: "",
        customer: "",
        supplier: "",
      });
    }
  }, [open, isEdit, editItem, priceList.currency, reset]);

  function onSubmit(data: ItemPriceFormValues) {
    if (isEdit && editItem) {
      update.mutate(
        { name: editItem.name, data },
        {
          onSuccess: () => {
            toast.success(t("itemPriceUpdateSuccess"));
            onOpenChange(false);
            onSuccess?.();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      create.mutate(
        {
          ...data,
          price_list: priceList.name,
          selling: priceList.selling,
          buying: priceList.buying,
        },
        {
          onSuccess: () => {
            toast.success(t("itemPriceCreateSuccess"));
            onOpenChange(false);
            onSuccess?.();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editItemPrice") : t("newItemPrice")}</DialogTitle>
          <DialogDescription>
            {priceList.price_list_name} ({priceList.currency})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Item */}
          <div className="space-y-2">
            <Label>{t("itemCode")}</Label>
            <LinkField
              doctype="Item"
              value={watch("item_code")}
              onChange={(v) => setValue("item_code", v, { shouldValidate: true })}
              placeholder={t("itemCode")}
              disabled={isEdit}
              descriptionField="item_name"
              showValueWithDescription
            />
            {errors.item_code && (
              <p className="text-sm text-destructive">{errors.item_code.message}</p>
            )}
          </div>

          {/* Rate + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("rate")}</Label>
              <MoneyInput
                value={watch("price_list_rate")}
                onChange={(v) => setValue("price_list_rate", v, { shouldValidate: true })}
              />
              {errors.price_list_rate && (
                <p className="text-sm text-destructive">{errors.price_list_rate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <LinkField
                doctype="Currency"
                value={watch("currency")}
                onChange={(v) => setValue("currency", v, { shouldValidate: true })}
              />
            </div>
          </div>

          {/* UOM + Min Qty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("uom")}</Label>
              <LinkField doctype="UOM" value={watch("uom")} onChange={(v) => setValue("uom", v)} />
            </div>
            <div className="space-y-2">
              <Label>{t("minQty")}</Label>
              <Input type="number" step="0.01" {...register("min_qty", { valueAsNumber: true })} />
            </div>
          </div>

          {/* Validity dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("validFrom")}</Label>
              <Input type="date" {...register("valid_from")} />
            </div>
            <div className="space-y-2">
              <Label>{t("validUpto")}</Label>
              <Input type="date" {...register("valid_upto")} />
            </div>
          </div>

          {/* Customer (selling) / Supplier (buying) */}
          {!!priceList.selling && (
            <div className="space-y-2">
              <Label>{t("customer")}</Label>
              <LinkField
                doctype="Customer"
                value={watch("customer") ?? ""}
                onChange={(v) => setValue("customer", v)}
                descriptionField="customer_name"
              />
            </div>
          )}
          {!!priceList.buying && (
            <div className="space-y-2">
              <Label>{t("supplier")}</Label>
              <LinkField
                doctype="Supplier"
                value={watch("supplier") ?? ""}
                onChange={(v) => setValue("supplier", v)}
                descriptionField="supplier_name"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : isEdit ? t("update") : t("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
