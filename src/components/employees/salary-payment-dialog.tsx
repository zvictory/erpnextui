"use client";

import { useEffect, useMemo } from "react";
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
import { useBankAccountsWithCurrency, useAccountCurrency } from "@/hooks/use-accounts";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useCompanies } from "@/hooks/use-companies";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { formatCurrency } from "@/lib/formatters";
import { formatNumber } from "@/lib/formatters";

interface SalaryPaymentFormValues {
  posting_date: string;
  amount: number;
  payable_amount: number;
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

  const { data: companies } = useCompanies();
  const companyCurrency = companies?.find((c) => c.name === company)?.default_currency ?? "";

  // Fetch payable account currency
  const { data: payableCurrency = "" } = useAccountCurrency(salaryPayableAccount);

  const {
    register,
    reset,
    setValue,
    watch,
  } = useForm<SalaryPaymentFormValues>({
    defaultValues: {
      posting_date: format(new Date(), "yyyy-MM-dd"),
      amount: defaultAmount,
      payable_amount: defaultAmount,
      bank_account: defaultBankAccount,
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        posting_date: format(new Date(), "yyyy-MM-dd"),
        amount: defaultAmount,
        payable_amount: defaultAmount,
        bank_account: defaultBankAccount,
        description: "",
      });
    }
  }, [open, defaultAmount, defaultBankAccount, reset]);

  const bankAccount = watch("bank_account");
  const amount = watch("amount");
  const payableAmount = watch("payable_amount");
  const postingDate = watch("posting_date");
  const description = watch("description");

  const { data: bankAccounts = [] } = useBankAccountsWithCurrency(company);
  const selectedAccount = bankAccounts.find((a) => a.name === bankAccount);
  const bankBalance = selectedAccount?.balance ?? 0;
  const bankCurrency = selectedAccount?.account_currency ?? "";
  const isInsufficientBalance = !!bankAccount && amount > 0 && amount > bankBalance;

  const isMultiCurrency = bankCurrency !== "" && payableCurrency !== "" && bankCurrency !== payableCurrency;

  // Auto-fetch exchange rate for suggesting payable amount
  const { data: fetchedRate } = useExchangeRate(
    isMultiCurrency ? payableCurrency : "",
    isMultiCurrency ? bankCurrency : "",
    postingDate,
  );

  // Derive suggested payable amount from bank amount + fetched rate
  const suggestedPayable = useMemo(() => {
    if (!isMultiCurrency || !fetchedRate || fetchedRate <= 0 || !amount) return null;
    // fetchedRate = "1 payableCurrency = X bankCurrency"
    return Math.round((amount / fetchedRate) * 100) / 100;
  }, [isMultiCurrency, fetchedRate, amount]);

  // Auto-fill payable amount when bank amount or rate changes (only if user hasn't manually edited)
  useEffect(() => {
    if (suggestedPayable !== null && suggestedPayable > 0) {
      setValue("payable_amount", suggestedPayable);
    }
  }, [suggestedPayable, setValue]);

  // Derived display rate for the exchange box
  const displayRate = useMemo(() => {
    if (!isMultiCurrency || !amount || !payableAmount) return "";
    if (bankCurrency === companyCurrency) {
      // "1 payableCurrency = X companyCurrency"
      return formatNumber(amount / payableAmount, 2);
    }
    if (payableCurrency === companyCurrency) {
      // "1 bankCurrency = X companyCurrency"
      return formatNumber(payableAmount / amount, 2);
    }
    // Neither is company currency — show "1 payableCurrency = X bankCurrency"
    return formatNumber(amount / payableAmount, 4);
  }, [isMultiCurrency, amount, payableAmount, bankCurrency, payableCurrency, companyCurrency]);

  const handleSubmit = async () => {
    if (!salaryPayableAccount) {
      toast.error(tSettings("salary.notConfigured"));
      return;
    }
    if (!bankAccount) return;
    if (!amount || amount <= 0) return;

    const effectivePayableAmount = isMultiCurrency ? payableAmount : amount;
    const effectivePayableCurrency = isMultiCurrency ? payableCurrency : bankCurrency;

    if (isMultiCurrency && (!effectivePayableAmount || effectivePayableAmount <= 0)) return;

    try {
      await paySalary.mutateAsync({
        postingDate,
        company,
        employee,
        employeeName,
        bankAmount: amount,
        payableAmount: effectivePayableAmount,
        bankCurrency,
        payableCurrency: effectivePayableCurrency,
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
            <Label>
              {t("advanceAmount")}
              {bankCurrency ? ` (${bankCurrency})` : ""}
            </Label>
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
                    {acc.name} ({acc.account_currency})
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

          {/* Exchange rate box — shown only when currencies differ */}
          {isMultiCurrency && (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 space-y-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t("payableAmount")} ({payableCurrency})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("payable_amount", { valueAsNumber: true })}
                  className="h-8"
                />
              </div>

              {/* Conversion summary */}
              {amount > 0 && payableAmount > 0 && displayRate && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {formatNumber(amount, 0)}&nbsp;{bankCurrency}
                  <span className="mx-1.5 opacity-40">→</span>
                  {formatNumber(payableAmount, 2)}&nbsp;{payableCurrency}
                  <span className="mx-1.5 opacity-40">@</span>
                  {displayRate}
                </p>
              )}
            </div>
          )}

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
              disabled={
                paySalary.isPending ||
                !bankAccount ||
                !amount ||
                isInsufficientBalance ||
                (isMultiCurrency && (!payableAmount || payableAmount <= 0))
              }
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
