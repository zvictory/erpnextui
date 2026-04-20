"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { frappe } from "@/lib/frappe-client";
import { useCompanyStore } from "@/stores/company-store";
import type { StockEntry } from "@/types/stock-entry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/shared/date-input";
import { getAssets } from "@/actions/assets";
import { getMechanics } from "@/actions/mechanics";
import { createMaintenanceLog, linkStockEntryToLog } from "@/actions/maintenance-logs";
import type { MaintenanceLogFormValues } from "@/types/maintenance";

const partSchema = z.object({
  partCode: z.string().optional(),
  partName: z.string().min(1),
  qty: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const logSchema = z.object({
  assetId: z.coerce.number().min(1, "Required"),
  date: z.string().min(1, "Required"),
  startTime: z.string().min(1, "Required"),
  endTime: z.string().min(1, "Required"),
  mechanicId: z.string().min(1, "Required"),
  maintenanceType: z.enum(["corrective", "preventive", "calibration", "cleaning", "capital"]),
  reason: z.string().min(1, "Required"),
  workDone: z.string().optional(),
  resolutionStatus: z.enum(["resolved", "partially_resolved", "unresolved", "needs_replacement"]),
  costClassification: z.enum(["operating_expense", "capitalized"]).optional(),
  notes: z.string().optional(),
  partsUsed: z.array(partSchema),
});

type FormValues = z.infer<typeof logSchema>;

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface MaintenanceLogDialogProps {
  assetId?: number;
  trigger?: React.ReactNode;
}

export function MaintenanceLogDialog({ assetId, trigger }: MaintenanceLogDialogProps) {
  const t = useTranslations("maintenance");
  const qc = useQueryClient();
  const company = useCompanyStore((s) => s.company);
  const [open, setOpen] = useState(false);

  const { data: assetsResult } = useQuery({
    queryKey: ["assets"],
    queryFn: () => getAssets(),
    enabled: !assetId,
  });

  const { data: mechanicsResult } = useQuery({
    queryKey: ["mechanics"],
    queryFn: () => getMechanics(),
  });

  const assets = assetsResult?.success ? assetsResult.data : [];
  const mechanics = mechanicsResult?.success ? mechanicsResult.data : [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(logSchema) as never,
    defaultValues: {
      assetId: assetId ?? 0,
      date: getToday(),
      startTime: "08:00",
      endTime: "09:00",
      mechanicId: "",
      maintenanceType: "corrective",
      reason: "",
      resolutionStatus: "resolved",
      partsUsed: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "partsUsed",
  });

  const mutation = useMutation({
    mutationFn: async (data: MaintenanceLogFormValues) => {
      const res = await createMaintenanceLog(data);
      if (!res.success) return res;

      // Create ERPNext Stock Entry (Material Issue) for parts with item codes
      const partsWithCodes = data.partsUsed.filter((p) => p.partCode);
      if (partsWithCodes.length > 0 && company) {
        try {
          const warehouse = "Maintenance Store - AN";
          const doc = await frappe.createDoc<StockEntry>("Stock Entry", {
            doctype: "Stock Entry",
            stock_entry_type: "Material Issue",
            posting_date: data.date,
            company,
            from_warehouse: warehouse,
            items: partsWithCodes.map((p) => ({
              doctype: "Stock Entry Detail",
              item_code: p.partCode!,
              qty: p.qty,
              s_warehouse: warehouse,
              basic_rate: p.unitPrice,
              amount: p.qty * p.unitPrice,
            })),
          });
          const full = await frappe.getDoc<StockEntry>("Stock Entry", doc.name);
          await frappe.submit(full as unknown as Record<string, unknown>);

          // Link the stock entry back to the maintenance log parts
          await linkStockEntryToLog(res.data.id, doc.name, warehouse);
        } catch (err) {
          // Stock Entry failed but maintenance log was saved — warn, don't fail
          console.error("Stock Entry creation failed:", err);
          toast.warning(t("stockEntryFailed"));
        }
      }

      return res;
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("logCreated"));
        qc.invalidateQueries({ queryKey: ["maintenanceLogs"] });
        qc.invalidateQueries({ queryKey: ["maintenanceKPIs"] });
        qc.invalidateQueries({ queryKey: ["stockEntries"] });
        qc.invalidateQueries({ queryKey: ["bins"] });
        reset();
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>{t("newLog")}</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("newLog")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          {/* Asset & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            {!assetId && (
              <div className="space-y-1.5">
                <Label>
                  {t("asset")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(watch("assetId") || "")}
                  onValueChange={(v) => setValue("assetId", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectAsset")} />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.assetCode} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assetId && (
                  <p className="text-sm text-destructive">{errors.assetId.message}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                {t("date")} <span className="text-destructive">*</span>
              </Label>
              <DateInput value={watch("date")} onChange={(e) => setValue("date", e.target.value)} />
            </div>
          </div>

          {/* Time & Mechanic */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>
                {t("startTime")} <span className="text-destructive">*</span>
              </Label>
              <Input type="time" {...register("startTime")} />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("endTime")} <span className="text-destructive">*</span>
              </Label>
              <Input type="time" {...register("endTime")} />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("mechanic")} <span className="text-destructive">*</span>
              </Label>
              <Select value={watch("mechanicId")} onValueChange={(v) => setValue("mechanicId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectMechanic")} />
                </SelectTrigger>
                <SelectContent>
                  {mechanics.map((m) => (
                    <SelectItem key={m.id} value={m.employeeId}>
                      {m.employeeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("type.label")}</Label>
              <Select
                value={watch("maintenanceType")}
                onValueChange={(v) =>
                  setValue("maintenanceType", v as FormValues["maintenanceType"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["corrective", "preventive", "calibration", "cleaning", "capital"] as const
                  ).map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`type.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("resolution.label")}</Label>
              <Select
                value={watch("resolutionStatus")}
                onValueChange={(v) =>
                  setValue("resolutionStatus", v as FormValues["resolutionStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["resolved", "partially_resolved", "unresolved", "needs_replacement"] as const
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`resolution.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason & Work done */}
          <div className="space-y-1.5">
            <Label>
              {t("reason")} <span className="text-destructive">*</span>
            </Label>
            <Input {...register("reason")} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t("workDone")}</Label>
            <Textarea {...register("workDone")} rows={2} />
          </div>

          {/* Parts used */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("partsUsed")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ partName: "", qty: 1, unitPrice: 0 })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("addPart")}
              </Button>
            </div>
            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Input placeholder={t("partName")} {...register(`partsUsed.${idx}.partName`)} />
                </div>
                <div className="w-20 space-y-1">
                  <Input
                    type="number"
                    placeholder={t("qty")}
                    {...register(`partsUsed.${idx}.qty`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t("unitPrice")}
                    {...register(`partsUsed.${idx}.unitPrice`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
