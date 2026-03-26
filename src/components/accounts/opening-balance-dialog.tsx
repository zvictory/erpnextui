"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/shared/date-input";
import { cn, getToday } from "@/lib/utils";
import { useEquityAccounts, useCreateOpeningBalanceJE } from "@/hooks/use-accounts";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useCompanies } from "@/hooks/use-companies";
import { useCompanyStore } from "@/stores/company-store";
import type { COAAccountListItem } from "@/types/account";

interface OpeningBalanceDialogProps {
  account: COAAccountListItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OpeningBalanceDialog({ account, open, onOpenChange }: OpeningBalanceDialogProps) {
  const t = useTranslations("accounts");
  const { company } = useCompanyStore();
  const { data: companies = [] } = useCompanies();
  const companyCurrency = companies.find((c) => c.name === company)?.default_currency ?? "USD";

  const { data: equityAccounts = [] } = useEquityAccounts(company);
  const createJE = useCreateOpeningBalanceJE();

  const [date, setDate] = useState<string>(() => getToday());
  const [amount, setAmount] = useState("");
  const [equityAccount, setEquityAccount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [baseAmount, setBaseAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const showExchangeRate = account.account_currency !== companyCurrency;

  // Auto-fetch exchange rate for the selected date
  const { data: fetchedRate } = useExchangeRate(account.account_currency, companyCurrency, date);

  useEffect(() => {
    if (fetchedRate && fetchedRate > 0) {
      setExchangeRate(String(fetchedRate));
      const amt = parseFloat(amount);
      if (amt > 0) setBaseAmount(String(Math.round(amt * fetchedRate * 100) / 100));
    }
  }, [fetchedRate]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAmountChange(val: string) {
    setAmount(val);
    const amt = parseFloat(val);
    const rate = parseFloat(exchangeRate);
    if (amt > 0 && rate > 0) {
      setBaseAmount(String(Math.round(amt * rate * 100) / 100));
    }
  }

  function handleBaseAmountChange(val: string) {
    setBaseAmount(val);
    const base = parseFloat(val);
    const amt = parseFloat(amount);
    if (base > 0 && amt > 0) {
      setExchangeRate(String(Math.round((base / amt) * 10000) / 10000));
    }
  }

  function handleExchangeRateChange(val: string) {
    setExchangeRate(val);
    const rate = parseFloat(val);
    const amt = parseFloat(amount);
    if (rate > 0 && amt > 0) {
      setBaseAmount(String(Math.round(amt * rate * 100) / 100));
    }
  }
  const isDebitNormal = ["Asset", "Expense"].includes(account.root_type);

  function reset() {
    setDate(getToday());
    setAmount("");
    setEquityAccount("");
    setExchangeRate("1");
    setBaseAmount("");
    setMemo("");
    setError("");
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    if (!equityAccount) {
      setError("Please select an equity account");
      return;
    }

    const parsedExchangeRate = parseFloat(exchangeRate) || 1;

    try {
      const je = await createJE.mutateAsync({
        targetAccount: account.name,
        account: { root_type: account.root_type, account_currency: account.account_currency },
        equityAccount,
        amount: parsedAmount,
        date,
        memo,
        exchangeRate: parsedExchangeRate,
        company,
        companyCurrency,
      });
      toast.success(`Opening balance set — JE: ${je.name}`);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create journal entry");
    }
  }

  const selectClass = cn(
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("setOpeningBalance")} — {account.account_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will <strong>{isDebitNormal ? "debit" : "credit"}</strong>{" "}
            <em>{account.account_name}</em> and{" "}
            <strong>{isDebitNormal ? "credit" : "debit"}</strong> the selected equity account.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="ob_date">{t("date")} *</Label>
            <DateInput id="ob_date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ob_amount">
              {t("amount")} ({account.account_currency}) *
            </Label>
            <Input
              id="ob_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ob_equity">{t("equityAccount")} *</Label>
            <select
              id="ob_equity"
              value={equityAccount}
              onChange={(e) => setEquityAccount(e.target.value)}
              className={cn(selectClass, !equityAccount && "text-muted-foreground")}
            >
              <option value="">{t("selectEquityAccount")}</option>
              {equityAccounts.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>

          {showExchangeRate && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ob_base_amount">
                  {t("amount")} ({companyCurrency})
                </Label>
                <Input
                  id="ob_base_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={baseAmount}
                  onChange={(e) => handleBaseAmountChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob_exchange_rate" className="text-xs text-muted-foreground">
                  {t("exchangeRate")} ({account.account_currency} → {companyCurrency})
                </Label>
                <Input
                  id="ob_exchange_rate"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => handleExchangeRateChange(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ob_memo">{t("memo")}</Label>
            <textarea
              id="ob_memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t("memoPlaceholder")}
              rows={2}
              className={cn(selectClass, "h-auto py-2 resize-none")}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createJE.isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={createJE.isPending}>
              {createJE.isPending ? t("creating") : t("setOpeningBalance")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
