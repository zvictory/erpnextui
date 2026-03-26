"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { LinkField } from "@/components/shared/link-field";
import {
  employeeAdvanceSchema,
  type EmployeeAdvanceFormValues,
} from "@/lib/schemas/employee-advance-schema";
import { useCreateEmployeeAdvance, useSubmitEmployeeAdvance } from "@/hooks/use-employee-advances";

interface EmployeeAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: string;
  company: string;
  defaultPurpose?: string;
  onSuccess?: () => void;
}

export function EmployeeAdvanceDialog({
  open,
  onOpenChange,
  employee,
  company,
  defaultPurpose = "",
  onSuccess,
}: EmployeeAdvanceDialogProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");

  const createAdvance = useCreateEmployeeAdvance();
  const submitAdvance = useSubmitEmployeeAdvance();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeAdvanceFormValues>({
    resolver: zodResolver(employeeAdvanceSchema),
    defaultValues: {
      employee,
      posting_date: format(new Date(), "yyyy-MM-dd"),
      advance_amount: 0,
      purpose: defaultPurpose,
      advance_account: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        employee,
        posting_date: format(new Date(), "yyyy-MM-dd"),
        advance_amount: 0,
        purpose: defaultPurpose,
        advance_account: "",
      });
    }
  }, [open, employee, defaultPurpose, reset]);

  const advanceAccount = watch("advance_account");

  const handleSave = async (data: EmployeeAdvanceFormValues, andSubmit: boolean) => {
    try {
      const created = await createAdvance.mutateAsync({ ...data, company });
      if (andSubmit && created.name) {
        await submitAdvance.mutateAsync(created.name);
        toast.success(t("advanceSubmitted"));
      } else {
        toast.success(t("advanceSaved"));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("advanceError"));
    }
  };

  const isPending = createAdvance.isPending || submitAdvance.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{defaultPurpose ? t("iceCreamSale") : t("newAdvance")}</DialogTitle>
          <DialogDescription>{t("advanceDescription")}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label>{t("date")}</Label>
            <Input type="date" {...register("posting_date")} />
            {errors.posting_date && (
              <p className="text-xs text-destructive">{errors.posting_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("advanceAmount")}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("advance_amount", { valueAsNumber: true })}
              autoFocus
            />
            {errors.advance_amount && (
              <p className="text-xs text-destructive">{errors.advance_amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("purpose")}</Label>
            <Input {...register("purpose")} placeholder={t("purposePlaceholder")} />
            {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("advanceAccount")}</Label>
            <LinkField
              doctype="Account"
              value={advanceAccount}
              onChange={(val) => setValue("advance_account", val)}
              placeholder={t("selectAccount")}
            />
            {errors.advance_account && (
              <p className="text-xs text-destructive">{errors.advance_account.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={handleSubmit((data) => handleSave(data, false))}
            >
              {t("saveDraft")}
            </Button>
            <Button disabled={isPending} onClick={handleSubmit((data) => handleSave(data, true))}>
              {isPending ? tCommon("loading") : t("saveAndSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
