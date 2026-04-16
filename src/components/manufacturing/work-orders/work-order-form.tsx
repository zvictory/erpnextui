"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkField } from "@/components/shared/link-field";
import { workOrderSchema, type WorkOrderFormValues } from "@/lib/schemas/manufacturing-schemas";
import { useCreateWorkOrder } from "@/hooks/use-manufacturing";
import { useCompanyStore } from "@/stores/company-store";

export function WorkOrderForm() {
  const t = useTranslations("mfg.workOrders");
  const router = useRouter();
  const { company } = useCompanyStore();
  const createWO = useCreateWorkOrder();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema) as never,
    defaultValues: {
      company,
      production_item: "",
      bom_no: "",
      qty: 1,
      planned_start_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: "",
      fg_warehouse: "",
      wip_warehouse: "",
      source_warehouse: "",
    },
  });

  const productionItem = watch("production_item");
  const bomNo = watch("bom_no");

  function onSubmit(data: WorkOrderFormValues) {
    createWO.mutate(
      { ...data, company },
      {
        onSuccess: (doc) => {
          toast.success(t("new") + " - OK");
          router.push(`/manufacturing/work-orders/${encodeURIComponent(doc.name)}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Row 1: Item + BOM */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("productionItem")}</Label>
          <LinkField
            doctype="Item"
            value={productionItem}
            onChange={(val) => setValue("production_item", val, { shouldValidate: true })}
            placeholder="Select item..."
            descriptionField="item_name"
            showValueWithDescription
          />
          {errors.production_item && (
            <p className="text-xs text-destructive">{errors.production_item.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t("bomNo")}</Label>
          <LinkField
            doctype="BOM"
            value={bomNo}
            onChange={(val) => setValue("bom_no", val, { shouldValidate: true })}
            placeholder="Select BOM..."
            filters={
              productionItem
                ? [
                    ["item", "=", productionItem],
                    ["is_active", "=", 1],
                  ]
                : undefined
            }
          />
          {errors.bom_no && <p className="text-xs text-destructive">{errors.bom_no.message}</p>}
        </div>
      </div>

      {/* Row 2: Qty + Dates */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("qty")}</Label>
          <Input type="number" min={1} step="any" {...register("qty")} />
          {errors.qty && <p className="text-xs text-destructive">{errors.qty.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t("startDate")}</Label>
          <Input type="date" {...register("planned_start_date")} />
          {errors.planned_start_date && (
            <p className="text-xs text-destructive">{errors.planned_start_date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t("deliveryDate")}</Label>
          <Input type="date" {...register("expected_delivery_date")} />
        </div>
      </div>

      {/* Row 3: Warehouses */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("fgWarehouse")}</Label>
          <LinkField
            doctype="Warehouse"
            value={watch("fg_warehouse") ?? ""}
            onChange={(val) => setValue("fg_warehouse", val)}
            placeholder="Select warehouse..."
          />
        </div>
        <div className="space-y-2">
          <Label>{t("wipWarehouse")}</Label>
          <LinkField
            doctype="Warehouse"
            value={watch("wip_warehouse") ?? ""}
            onChange={(val) => setValue("wip_warehouse", val)}
            placeholder="Select warehouse..."
          />
        </div>
        <div className="space-y-2">
          <Label>{t("sourceWarehouse")}</Label>
          <LinkField
            doctype="Warehouse"
            value={watch("source_warehouse") ?? ""}
            onChange={(val) => setValue("source_warehouse", val)}
            placeholder="Select warehouse..."
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/manufacturing/work-orders")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createWO.isPending}>
          {createWO.isPending ? "..." : t("new")}
        </Button>
      </div>
    </form>
  );
}
