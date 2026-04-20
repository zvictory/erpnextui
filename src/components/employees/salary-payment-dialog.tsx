"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

/**
 * Determines "base" and "quote" for display: "1 base = ? quote".
 * Anchors to company currency so rates are human-readable (e.g. "1 USD = 12 800 UZS").
 */
function getDisplayPair(fromCcy: string, toCcy: string, companyCcy: string): [string, string] {
  if (fromCcy === companyCcy) return [toCcy, companyCcy];
  if (toCcy === companyCcy) return [fromCcy, companyCcy];
  return [fromCcy, toCcy];
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
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

  const [rateStr, setRateStr] = useState("1");
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);

  const { data: companies } = useCompanies();
  const companyCurrency = companies?.find((c) => c.name === company)?.default_currency ?? "";

  // Fetch payable account currency — must resolve before submit
  const { data: payableCurrency = "", isLoading: payableCurrencyLoading } =
    useAccountCurrency(salaryPayableAccount);

  const { register, reset, setValue, watch } = useForm<SalaryPaymentFormValues>({
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
      setRateStr("1");
      setRateManuallyEdited(false);
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

  const isMultiCurrency =
    bankCurrency !== "" && payableCurrency !== "" && bankCurrency !== payableCurrency;

  // Display pair: always anchor to company currency for readable rates
  const [baseCurrency, quoteCurrency] = useMemo(
    () =>
      isMultiCurrency ? getDisplayPair(payableCurrency, bankCurrency, companyCurrency) : ["", ""],
    [isMultiCurrency, payableCurrency, bankCurrency, companyCurrency],
  );
  const payableIsBase = baseCurrency === payableCurrency;

  // Auto-fetch exchange rate: "1 base = X quote"
  const { data: fetchedRate } = useExchangeRate(
    isMultiCurrency ? baseCurrency : "",
    isMultiCurrency ? quoteCurrency : "",
    postingDate,
  );

  // Reset manual flag when currencies or date change
  useEffect(() => {
    setRateManuallyEdited(false);
  }, [baseCurrency, quoteCurrency, postingDate]);

  // Effective rate: use fetched unless user manually overrode
  const effectiveRateStr =
    !rateManuallyEdited && fetchedRate && fetchedRate > 0 ? String(fetchedRate) : rateStr;
  const parsedRate = parseFloat(effectiveRateStr) || 1;

  // Auto-derive payable when not manually edited
  const autoPayable = useMemo(() => {
    if (!isMultiCurrency || !amount || parsedRate <= 0) return 0;
    return payableIsBase ? roundTo2(amount / parsedRate) : roundTo2(amount * parsedRate);
  }, [isMultiCurrency, amount, parsedRate, payableIsBase]);

  useEffect(() => {
    if (!rateManuallyEdited && autoPayable > 0) {
      setValue("payable_amount", autoPayable);
    }
  }, [rateManuallyEdited, autoPayable, setValue]);

  // ── Bidirectional handlers ──────────────────────────────────
  const handleRateChange = useCallback(
    (value: string) => {
      setRateStr(value);
      setRateManuallyEdited(true);
      const r = parseFloat(value) || 1;
      if (amount <= 0 || r <= 0) return;
      setValue("payable_amount", payableIsBase ? roundTo2(amount / r) : roundTo2(amount * r));
    },
    [amount, payableIsBase, setValue],
  );

  const handlePayableChange = useCallback(
    (value: string) => {
      const p = parseFloat(value) || 0;
      setValue("payable_amount", p);
      setRateManuallyEdited(true);
      if (p <= 0 || amount <= 0) return;
      setRateStr(String(payableIsBase ? amount / p : p / amount));
    },
    [amount, payableIsBase, setValue],
  );

  const handleRateBlur = useCallback(() => {
    const r = parseFloat(effectiveRateStr) || 1;
    if (amount <= 0 || r <= 0) return;
    const raw = payableIsBase ? amount / r : amount * r;
    const rounded = roundTo2(raw);
    if (rounded <= 0) return;
    setRateStr(String(payableIsBase ? amount / rounded : rounded / amount));
    setRateManuallyEdited(true);
    setValue("payable_amount", rounded);
  }, [effectiveRateStr, amount, payableIsBase, setValue]);

  const handleSubmit = async () => {
    if (!salaryPayableAccount) {
      toast.error(tSettings("salary.notConfigured"));
      return;
    }
    if (!bankAccount || !amount || amount <= 0) return;
    if (!payableCurrency || !bankCurrency) return;

    const effectivePayableAmount = isMultiCurrency ? payableAmount : amount;

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
        payableCurrency,
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

        {!salaryPayableAccount && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {tSettings("salary.notConfigured")}
          </div>
        )}

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
              <div className="grid grid-cols-2 gap-3">
                {/* Rate input */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("exchangeRate")}</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      1 {baseCurrency} =
                    </span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={effectiveRateStr}
                      onChange={(e) => handleRateChange(e.target.value)}
                      onBlur={handleRateBlur}
                      className="h-8 min-w-0"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">{quoteCurrency}</span>
                  </div>
                </div>

                {/* Payable amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {t("payableAmount")} ({payableCurrency})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payableAmount || ""}
                    onChange={(e) => handlePayableChange(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Conversion summary */}
              {amount > 0 && payableAmount > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {formatNumber(amount, 0)}&nbsp;{bankCurrency}
                  <span className="mx-1.5 opacity-40">&rarr;</span>
                  {formatNumber(payableAmount, 2)}&nbsp;{payableCurrency}
                  <span className="mx-1.5 opacity-40">@</span>
                  {formatNumber(parsedRate, parsedRate < 1 ? 6 : 2)}
                </p>
              )}

              {/* Base currency equivalent */}
              {amount > 0 &&
                payableAmount > 0 &&
                companyCurrency &&
                (bankCurrency === companyCurrency ? (
                  <p className="text-[11px] text-muted-foreground/60 text-center">
                    &asymp; {formatCurrency(amount, companyCurrency, true)}
                  </p>
                ) : payableCurrency === companyCurrency ? (
                  <p className="text-[11px] text-muted-foreground/60 text-center">
                    &asymp; {formatCurrency(payableAmount, companyCurrency, true)}
                  </p>
                ) : null)}
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
                payableCurrencyLoading ||
                !bankAccount ||
                !amount ||
                !payableCurrency ||
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
