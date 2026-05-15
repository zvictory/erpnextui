"use client";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBulkUpdatePrices } from "@/hooks/use-price-lists";
import { bulkUpdateSchema, type BulkUpdateFormValues } from "@/lib/schemas/price-list-schema";

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceListName: string;
  itemCount: number;
  onSuccess?: () => void;
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  priceListName,
  itemCount,
  onSuccess,
}: BulkUpdateDialogProps) {
  const t = useTranslations("priceLists");
  const bulkUpdate = useBulkUpdatePrices();

  const form = useForm<BulkUpdateFormValues>({
    resolver: zodResolver(bulkUpdateSchema),
    defaultValues: {
      percentage: 10,
      direction: "increase",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const direction = watch("direction");
  const percentage = watch("percentage");

  function onSubmit(data: BulkUpdateFormValues) {
    bulkUpdate.mutate(
      {
        priceList: priceListName,
        percentage: data.percentage,
        direction: data.direction,
      },
      {
        onSuccess: (result) => {
          toast.success(t("bulkUpdateSuccess", { count: result.succeeded }));
          if (result.failed > 0) {
            toast.error(`${result.failed} failed`);
          }
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bulkUpdateTitle")}</DialogTitle>
          <DialogDescription>{t("bulkUpdateDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Direction */}
          <div className="space-y-2">
            <Label>{t("direction")}</Label>
            <RadioGroup
              value={direction}
              onValueChange={(v) => setValue("direction", v as "increase" | "decrease")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="increase" id="increase" />
                <Label htmlFor="increase">{t("increase")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="decrease" id="decrease" />
                <Label htmlFor="decrease">{t("decrease")}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Percentage */}
          <div className="space-y-2">
            <Label>{t("percentage")} (%)</Label>
            <Input type="number" step="0.01" {...register("percentage", { valueAsNumber: true })} />
            {errors.percentage && (
              <p className="text-sm text-destructive">{errors.percentage.message}</p>
            )}
          </div>

          {/* Preview */}
          <p className="text-sm text-muted-foreground rounded-md bg-muted p-3">
            {t("bulkUpdateConfirm", {
              direction: t(direction),
              count: itemCount,
              priceList: priceListName,
              percentage: percentage || 0,
            })}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending ? t("saving") : t("bulkUpdate")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
