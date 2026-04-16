"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { createPreventiveSchedule } from "@/actions/preventive-schedule";
import type { PreventiveScheduleFormValues } from "@/types/maintenance";

const scheduleSchema = z.object({
  assetId: z.coerce.number().min(1, "Required"),
  taskName: z.string().min(1, "Required"),
  taskDescription: z.string().optional(),
  frequencyType: z.enum(["days", "weeks", "months", "years"]),
  frequencyValue: z.coerce.number().min(1),
  estimatedDurationHours: z.coerce.number().min(0).optional(),
  nextDue: z.string().min(1, "Required"),
  assignedMechanic: z.string().optional(),
});

type FormValues = z.infer<typeof scheduleSchema>;

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface PreventiveScheduleDialogProps {
  assetId?: number;
  trigger?: React.ReactNode;
}

export function PreventiveScheduleDialog({
  assetId,
  trigger,
}: PreventiveScheduleDialogProps) {
  const t = useTranslations("maintenance");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: assetsResult } = useQuery({
    queryKey: ["assets"],
    queryFn: () => getAssets(),
    enabled: !assetId,
  });

  const assets = assetsResult?.success ? assetsResult.data : [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(scheduleSchema) as never,
    defaultValues: {
      assetId: assetId ?? 0,
      taskName: "",
      frequencyType: "months",
      frequencyValue: 1,
      nextDue: getToday(),
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PreventiveScheduleFormValues) =>
      createPreventiveSchedule(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("scheduleCreated"));
        qc.invalidateQueries({ queryKey: ["preventiveSchedule"] });
        reset();
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>{t("newSchedule")}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("newSchedule")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
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
                <p className="text-sm text-destructive">
                  {errors.assetId.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              {t("taskName")} <span className="text-destructive">*</span>
            </Label>
            <Input {...register("taskName")} />
            {errors.taskName && (
              <p className="text-sm text-destructive">
                {errors.taskName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("taskDescription")}</Label>
            <Textarea {...register("taskDescription")} rows={2} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("frequencyValue")}</Label>
              <Input
                type="number"
                {...register("frequencyValue", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("frequencyType")}</Label>
              <Select
                value={watch("frequencyType")}
                onValueChange={(v) =>
                  setValue("frequencyType", v as FormValues["frequencyType"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["days", "weeks", "months", "years"] as const).map((f) => (
                    <SelectItem key={f} value={f}>
                      {t(`freq.${f}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                {t("nextDue")} <span className="text-destructive">*</span>
              </Label>
              <DateInput
                value={watch("nextDue")}
                onChange={(e) => setValue("nextDue", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("estimatedDuration")}</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="h"
                {...register("estimatedDurationHours", {
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("assignedMechanic")}</Label>
            <Input {...register("assignedMechanic")} />
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
