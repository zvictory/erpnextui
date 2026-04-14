"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsufficientBalanceWarning } from "@/components/shared/insufficient-balance-warning";
import { usePaySalary } from "@/hooks/use-salary";
import { useBankAccountsWithCurrency } from "@/hooks/use-accounts";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { formatCurrency } from "@/lib/formatters";

interface SalaryPaymentFormValues {
  posting_date: string;
  amount: number;
  bank_account: string;
  description: string;
}

interface SalaryPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: string;
  employeeName: string;
  company: string;
  defaultAmount?: number;
}

export function SalaryPaymentDialog({
  open,
  onOpenChange,
  employee,
  employeeName,
  company,
  defaultAmount = 0,
}: SalaryPaymentDialogProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("settings");

  const salaryPayableAccount = useUISettingsStore(
    (s) => s.getCompanySettings(company).salaryPayableAccount,
  );
  const defaultBankAccount = useUISettingsStore(
    (s) => s.getCompanySettings(company).salaryBankAccount,
  );
  const paySalary = usePaySalary();

  const {
    register,
    reset,
    setValue,
    watch,
  } = useForm<SalaryPaymentFormValues>({
    defaultValues: {
      posting_date: format(new Date(), "yyyy-MM-dd"),
      amount: defaultAmount,
      bank_account: defaultBankAccount,
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        posting_date: format(new Date(), "yyyy-MM-dd"),
        amount: defaultAmount,
        bank_account: defaultBankAccount,
        description: "",
      });
    }
  }, [open, defaultAmount, defaultBankAccount, reset]);

  const bankAccount = watch("bank_account");
  const amount = watch("amount");
  const postingDate = watch("posting_date");
  const description = watch("description");

  const { data: bankAccounts = [] } = useBankAccountsWithCurrency(company);
  const selectedAccount = bankAccounts.find((a) => a.name === bankAccount);
  const bankBalance = selectedAccount?.balance ?? 0;
  const bankCurrency = selectedAccount?.account_currency ?? "";
  const isInsufficientBalance = !!bankAccount && amount > 0 && amount > bankBalance;

  const handleSubmit = async () => {
    if (!salaryPayableAccount) {
      toast.error(tSettings("salary.notConfigured"));
      return;
    }
    if (!bankAccount) return;
    if (!amount || amount <= 0) return;

    try {
      await paySalary.mutateAsync({
        postingDate,
        company,
        employee,
        employeeName,
        amount,
        salaryPayableAccount,
        bankAccount,
        description: description.trim() || undefined,
      });
      toast.success(t("salaryPaid"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("paySalary")}</DialogTitle>
          <DialogDescription>{employeeName}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label>{t("date")}</Label>
            <Input type="date" {...register("posting_date")} />
          </div>

          <div className="space-y-2">
            <Label>{t("advanceAmount")}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("amount", { valueAsNumber: true })}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>{t("bankAccount")}</Label>
            <Select value={bankAccount} onValueChange={(val) => setValue("bank_account", val)}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.name} value={acc.name}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bankAccount && selectedAccount && (
              <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Balance:{" "}
                {formatCurrency(
                  selectedAccount.balance ?? 0,
                  selectedAccount.account_currency,
                  true,
                )}
              </span>
            )}
            {bankAccount && (
              <InsufficientBalanceWarning
                balance={bankBalance}
                amount={amount}
                currency={bankCurrency}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <Textarea
              rows={2}
              placeholder={t("descriptionPlaceholder")}
              {...register("description")}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              disabled={paySalary.isPending || !bankAccount || !amount || isInsufficientBalance}
              onClick={handleSubmit}
            >
              {paySalary.isPending ? tCommon("loading") : t("payAndSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
