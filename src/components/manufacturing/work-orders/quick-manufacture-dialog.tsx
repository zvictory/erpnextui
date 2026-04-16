"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMakeStockEntry } from "@/hooks/use-manufacturing";
import { formatNumber } from "@/lib/formatters";
import type { WorkOrder } from "@/types/manufacturing";

interface QuickManufactureDialogProps {
  workOrder: WorkOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickManufactureDialog({
  workOrder,
  open,
  onOpenChange,
}: QuickManufactureDialogProps) {
  const t = useTranslations("mfg.workOrders");
  const remaining = Math.max(0, workOrder.qty - workOrder.produced_qty);

  const schema = z.object({
    qty: z.coerce
      .number()
      .min(0.001, "Quantity must be greater than 0")
      .max(remaining, `Max ${remaining}`),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { qty: remaining },
  });

  const makeStockEntry = useMakeStockEntry();

  function onSubmit(data: FormValues) {
    // Proportional labor cost based on manufactured qty vs total WO qty
    const laborCost = workOrder.custom_total_labor_cost ?? 0;
    const proportionalLabor =
      laborCost > 0 && workOrder.qty > 0
        ? Math.round((laborCost * data.qty) / workOrder.qty)
        : 0;

    makeStockEntry.mutate(
      {
        workOrder: workOrder.name,
        purpose: "Manufacture",
        qty: data.qty,
        additionalCosts:
          proportionalLabor > 0
            ? [{ expense_account: "", description: "Direct Labor from Tabel", amount: proportionalLabor }]
            : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("quickManufacture") + " - OK");
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("quickManufacture")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {workOrder.item_name} &mdash; {t("remaining")}:{" "}
            <span className="font-medium tabular-nums">{formatNumber(remaining)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manufacture-qty">{t("qtyToManufacture")}</Label>
            <Input
              id="manufacture-qty"
              type="number"
              step="any"
              min={0.001}
              max={remaining}
              {...register("qty")}
            />
            {errors.qty && <p className="text-xs text-destructive">{errors.qty.message}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={makeStockEntry.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={makeStockEntry.isPending}>
              {makeStockEntry.isPending ? "..." : t("quickManufacture")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
