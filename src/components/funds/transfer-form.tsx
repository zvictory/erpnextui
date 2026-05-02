"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/shared/date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StatusBar } from "@/components/shared/status-bar";
import { EditModeBar } from "@/components/expenses/edit-mode-bar";
import { InsufficientBalanceWarning } from "@/components/shared/insufficient-balance-warning";
import { useTransferAccountsWithCurrency } from "@/hooks/use-accounts";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useCompanyStore } from "@/stores/company-store";
import { useCompanies } from "@/hooks/use-companies";
import { cn, formatCurrency } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import type { JournalEntry, JournalEntryAccount } from "@/types/journal-entry";

export interface TransferFormData {
  postingDate: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  exchangeRate: number;
  convertedTotal: number;
  memo: string;
  accounts: JournalEntryAccount[];
  editingName: string | null;
  editingDocstatus: number | null;
}

export interface TransferFormHandle {
  loadEntryForEdit: (name: string) => Promise<void>;
  cancelEditMode: () => void;
}

interface TransferFormProps {
  onSubmit: (data: TransferFormData) => Promise<void>;
  onLoadEntry: (name: string) => Promise<JournalEntry>;
  isSubmitting: boolean;
}

function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Round to 6 decimal places and convert to string, eliminating IEEE 754 float noise. */
const rateStr = (n: number) => String(Math.round(n * 1e6) / 1e6);

/**
 * Determines the "base" and "quote" currencies for display.
 * Always puts the stronger currency first — "1 USD = ? UZS", never "1 UZS = 0.000083 USD".
 * Returns [baseCurrency, quoteCurrency] where display is "1 base = ? quote".
 */
function getDisplayPair(
  fromCurrency: string,
  toCurrency: string,
  companyCurrency: string,
): [string, string] {
  const STRONG = ["USD", "EUR", "GBP", "CNY", "RUB"];
  const fromStrong = STRONG.includes(fromCurrency);
  const toStrong = STRONG.includes(toCurrency);
  // One side is clearly stronger — put it first regardless of which is company
  if (fromStrong && !toStrong) return [fromCurrency, toCurrency];
  if (toStrong && !fromStrong) return [toCurrency, fromCurrency];
  // Same strength class — keep company currency as quote
  if (fromCurrency === companyCurrency) return [toCurrency, fromCurrency];
  return [fromCurrency, toCurrency];
}

function buildTransferAccounts(
  fromAccount: string,
  toAccount: string,
  creditAmount: number,
  fromExRate: number,
  debitAmount: number,
  toExRate: number,
  fromCurrency?: string,
  toCurrency?: string,
): JournalEntryAccount[] {
  return [
    {
      doctype: "Journal Entry Account",
      account: fromAccount,
      credit_in_account_currency: creditAmount,
      exchange_rate: fromExRate,
      ...(fromCurrency ? { account_currency: fromCurrency } : {}),
    },
    {
      doctype: "Journal Entry Account",
      account: toAccount,
      debit_in_account_currency: debitAmount,
      exchange_rate: toExRate,
      ...(toCurrency ? { account_currency: toCurrency } : {}),
    },
  ];
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

const TransferFormInner: React.ForwardRefRenderFunction<TransferFormHandle, TransferFormProps> = (
  { onSubmit, onLoadEntry, isSubmitting },
  ref,
) => {
  const t = useTranslations("funds");
  const { company } = useCompanyStore();
  const {
    data: transferAccounts = [],
    isLoading: isAccountsLoading,
    isError: isAccountsError,
  } = useTransferAccountsWithCurrency(company);

  const bankAccounts = transferAccounts.filter((a) => a.root_type === "Asset");
  const equityAccounts = transferAccounts.filter((a) => a.root_type === "Equity");
  const { data: companies } = useCompanies();

  const companyCurrency = companies?.find((c) => c.name === company)?.default_currency ?? "";

  const [postingDate, setPostingDate] = useState(getToday);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("1");
  const [receivedInput, setReceivedInput] = useState("");
  const [memo, setMemo] = useState("");

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDocstatus, setEditingDocstatus] = useState<number | null>(null);

  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });

  const fromCurrency = transferAccounts.find((a) => a.name === fromAccount)?.account_currency ?? "";
  const toCurrency = transferAccounts.find((a) => a.name === toAccount)?.account_currency ?? "";
  const isExchange = fromCurrency !== "" && toCurrency !== "" && fromCurrency !== toCurrency;

  const [baseCurrency, quoteCurrency] = useMemo(
    () => (isExchange ? getDisplayPair(fromCurrency, toCurrency, companyCurrency) : ["", ""]),
    [isExchange, fromCurrency, toCurrency, companyCurrency],
  );

  // When baseCurrency !== fromCurrency the display direction is flipped:
  // rate input shows "1 base = ? quote" but 'from' is the quote side, so amounts use division.
  const isDisplayInverted = isExchange && baseCurrency !== fromCurrency;

  // Auto-fetch exchange rate for the selected date
  const { data: fetchedRate } = useExchangeRate(baseCurrency, quoteCurrency, postingDate);

  // State for manual-edit flag (read during render, so must be state not a ref)
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);

  // Reset manual edit flag when currencies or date change
  useEffect(() => {
    setRateManuallyEdited(false);
  }, [baseCurrency, quoteCurrency, postingDate]);

  const parsedAmount = parseFloat(amount) || 0;

  // Derive effective rate: use fetched rate unless user has manually edited or we're in edit mode
  const effectiveRateStr =
    !rateManuallyEdited && !editingName && fetchedRate && fetchedRate > 0
      ? rateStr(fetchedRate)
      : rate;
  const parsedRate = parseFloat(effectiveRateStr) || 1;

  // Derive effective received amount: auto-compute unless user has manually edited.
  // isDisplayInverted: from is the quote side → amount / rate; else from is base → amount * rate.
  const autoReceived =
    isExchange && parsedAmount > 0 && parsedRate > 0
      ? String(
          roundTo2(isDisplayInverted ? parsedAmount / parsedRate : parsedAmount * parsedRate),
        )
      : "";
  const effectiveReceivedInput = rateManuallyEdited ? receivedInput : autoReceived;

  const receivedCurrency = toCurrency;

  const handleSwap = useCallback(() => {
    setFromAccount((prev) => {
      const oldFrom = prev;
      setToAccount(oldFrom);
      return toAccount;
    });
    // Rate stays the same — it's anchored to company currency
  }, [toAccount]);

  const handleRateChange = useCallback(
    (value: string) => {
      setRate(value);
      setRateManuallyEdited(true);
      const r = parseFloat(value) || 1;
      if (parsedAmount <= 0) return;
      const newReceived = isDisplayInverted ? parsedAmount / r : parsedAmount * r;
      setReceivedInput(String(roundTo2(newReceived)));
    },
    [parsedAmount, isDisplayInverted],
  );

  const handleRateBlur = useCallback(() => {
    const r = parseFloat(effectiveRateStr) || 1;
    if (parsedAmount <= 0 || r <= 0) return;
    const rawReceived = isDisplayInverted ? parsedAmount / r : parsedAmount * r;
    const rounded = roundTo2(rawReceived);
    if (rounded <= 0) return;
    const correctedRate = isDisplayInverted ? parsedAmount / rounded : rounded / parsedAmount;
    setRate(rateStr(correctedRate));
    setRateManuallyEdited(true);
    setReceivedInput(String(rounded));
  }, [effectiveRateStr, parsedAmount, isDisplayInverted]);

  const handleReceivedChange = useCallback(
    (value: string) => {
      setReceivedInput(value);
      setRateManuallyEdited(true);
      const r = parseFloat(value);
      if (r <= 0 || parsedAmount <= 0) return;
      const newRate = isDisplayInverted ? parsedAmount / r : r / parsedAmount;
      setRate(rateStr(newRate));
    },
    [parsedAmount, isDisplayInverted],
  );

  const resetForm = useCallback(() => {
    setPostingDate(getToday());
    setFromAccount("");
    setToAccount("");
    setAmount("");
    setRate("1");
    setReceivedInput("");
    setMemo("");
    setEditingName(null);
    setEditingDocstatus(null);
    setRateManuallyEdited(false);
    setStatus({ type: null, message: "" });
  }, []);

  const cancelEditMode = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const loadEntryForEdit = useCallback(
    async (name: string) => {
      try {
        setStatus({ type: "loading", message: "Loading entry..." });
        const entry = await onLoadEntry(name);

        setPostingDate(entry.posting_date);
        setMemo(entry.user_remark || "");

        // Credit account = fromAccount, debit account = toAccount
        const creditAcc = entry.accounts.find(
          (a) => a.credit_in_account_currency && a.credit_in_account_currency > 0,
        );
        const debitAcc = entry.accounts.find(
          (a) => a.debit_in_account_currency && a.debit_in_account_currency > 0,
        );

        if (creditAcc) setFromAccount(creditAcc.account);
        if (debitAcc) setToAccount(debitAcc.account);

        if (creditAcc?.credit_in_account_currency) {
          setAmount(String(creditAcc.credit_in_account_currency));
        }

        if (debitAcc?.debit_in_account_currency) {
          setReceivedInput(String(debitAcc.debit_in_account_currency));
        }

        // Restore exchange rate if accounts have different currencies
        const loadedFromCurrency =
          transferAccounts.find((a) => a.name === creditAcc?.account)?.account_currency ?? "";
        const loadedToCurrency =
          transferAccounts.find((a) => a.name === debitAcc?.account)?.account_currency ?? "";

        if (loadedFromCurrency && loadedToCurrency && loadedFromCurrency !== loadedToCurrency) {
          // exchange_rate on the JE row = "company currency per 1 account currency"
          const foreignAcc = loadedFromCurrency === companyCurrency ? debitAcc : creditAcc;
          if (foreignAcc?.exchange_rate && foreignAcc.exchange_rate !== 1) {
            setRate(rateStr(foreignAcc.exchange_rate));
          }
        } else {
          setRate("1");
        }

        setEditingName(entry.name);
        setEditingDocstatus(entry.docstatus);
        setStatus({ type: null, message: "" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load entry";
        setStatus({ type: "error", message });
      }
    },
    [onLoadEntry, transferAccounts, companyCurrency],
  );

  useImperativeHandle(ref, () => ({
    loadEntryForEdit,
    cancelEditMode,
  }));

  const fromAccountData = transferAccounts.find((a) => a.name === fromAccount);
  const fromBalance = fromAccountData?.balance ?? 0;
  const fromCurrencyCode = fromAccountData?.account_currency ?? "";
  // Equity accounts have no "insufficient balance" concept — owners can always invest
  const isEquityFrom = fromAccountData?.root_type === "Equity";
  const isInsufficientBalance =
    !!fromAccount && !isEquityFrom && parsedAmount > 0 && parsedAmount > fromBalance;

  const validate = (): string | null => {
    if (!postingDate) return "Date is required";
    if (!fromAccount) return "Transfer From account is required";
    if (!toAccount) return "Transfer To account is required";
    if (fromAccount === toAccount) return "From and To accounts must be different";
    if (parsedAmount <= 0) return "Amount must be greater than 0";
    if (isExchange && parsedRate <= 0) return "Exchange rate must be greater than 0";
    if (isInsufficientBalance) return "Insufficient balance in source account";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      setStatus({ type: "error", message: error });
      return;
    }

    setStatus({ type: "loading", message: "Posting transfer..." });

    try {
      const parsedReceivedInput = parseFloat(effectiveReceivedInput) || 0;

      let fromExRate: number, toExRate: number, debitAmount: number;
      if (fromCurrency === toCurrency) {
        fromExRate = 1;
        toExRate = 1;
        debitAmount = parsedAmount;
      } else if (fromCurrency === companyCurrency) {
        // Sent company (UZS) → received foreign (USD)
        // Rate = amount / received ensures debit × toExRate = amount exactly
        const effectiveRate =
          parsedReceivedInput > 0 ? parsedAmount / parsedReceivedInput : parsedRate;
        fromExRate = 1;
        toExRate = effectiveRate;
        debitAmount = parsedReceivedInput;
      } else if (toCurrency === companyCurrency) {
        // Sent foreign (USD) → received company (UZS)
        const effectiveRate = parsedAmount > 0 ? parsedReceivedInput / parsedAmount : parsedRate;
        fromExRate = effectiveRate;
        toExRate = 1;
        debitAmount = parsedReceivedInput;
      } else {
        // Neither is company currency — keep existing behaviour
        fromExRate = isExchange ? parsedRate : 1;
        toExRate = isExchange ? parsedRate : 1;
        debitAmount = parsedReceivedInput > 0 ? parsedReceivedInput : parsedAmount;
      }

      const accounts = buildTransferAccounts(
        fromAccount,
        toAccount,
        parsedAmount,
        fromExRate,
        debitAmount,
        toExRate,
        fromCurrency,
        toCurrency,
      );

      await onSubmit({
        postingDate,
        fromAccount,
        toAccount,
        amount: parsedAmount,
        exchangeRate: parsedRate,
        convertedTotal: debitAmount,
        memo,
        accounts,
        editingName,
        editingDocstatus,
      });

      setStatus({ type: "success", message: "Transfer posted successfully" });
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to post transfer";
      setStatus({ type: "error", message });
    }
  };

  const submitButtonText = (() => {
    if (!editingName) return t("transfer");
    if (editingDocstatus === 1) return t("amendTransfer");
    return t("updateTransfer");
  })();

  function renderBalance(accountName: string) {
    if (!accountName) return null;
    if (isAccountsLoading)
      return <span className="text-xs text-muted-foreground">{t("loading")}</span>;
    if (isAccountsError)
      return <span className="text-xs text-destructive">{t("balanceUnavailable")}</span>;
    const acc = transferAccounts.find((a) => a.name === accountName);
    if (!acc) return null;
    return (
      <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Balance: {formatCurrency(acc.balance ?? 0, acc.account_currency, true)}
      </span>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="overflow-hidden pt-0">
        {/* Green accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-400" />

        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base">{t("transferFunds")}</CardTitle>
          <CardDescription>{t("moveMoneyBetween")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <EditModeBar
            editingName={editingName}
            editingDocstatus={editingDocstatus}
            onCancel={cancelEditMode}
          />

          {/* Row 1: From / Swap / To */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_36px_1fr] items-end gap-x-2">
              {/* From */}
              <div className="space-y-1.5">
                <Label htmlFor="fromAccount">
                  {t("from")} <span className="text-destructive">*</span>
                </Label>
                <Select value={fromAccount} onValueChange={setFromAccount}>
                  <SelectTrigger id="fromAccount">
                    <SelectValue placeholder={t("selectAccount")} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">Bank & Cash</SelectLabel>
                        {bankAccounts.map((acc) => (
                          <SelectItem key={acc.name} value={acc.name}>
                            {acc.name} ({acc.account_currency})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {equityAccounts.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">Equity</SelectLabel>
                        {equityAccounts.map((acc) => (
                          <SelectItem key={acc.name} value={acc.name}>
                            {acc.name} ({acc.account_currency})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Swap */}
              <button
                type="button"
                onClick={handleSwap}
                disabled={!fromAccount || !toAccount}
                title={t("swapAccounts")}
                className={cn(
                  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-colors",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  "disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                <ArrowLeftRight className="size-3.5" />
              </button>

              {/* To */}
              <div className="space-y-1.5">
                <Label htmlFor="toAccount">
                  {t("to")} <span className="text-destructive">*</span>
                </Label>
                <Select value={toAccount} onValueChange={setToAccount}>
                  <SelectTrigger id="toAccount">
                    <SelectValue placeholder={t("selectAccount")} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.filter((a) => a.name !== fromAccount).length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">Bank & Cash</SelectLabel>
                        {bankAccounts
                          .filter((acc) => acc.name !== fromAccount)
                          .map((acc) => (
                            <SelectItem key={acc.name} value={acc.name}>
                              {acc.name} ({acc.account_currency})
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                    {equityAccounts.filter((a) => a.name !== fromAccount).length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">Equity</SelectLabel>
                        {equityAccounts
                          .filter((acc) => acc.name !== fromAccount)
                          .map((acc) => (
                            <SelectItem key={acc.name} value={acc.name}>
                              {acc.name} ({acc.account_currency})
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Balances aligned under each account */}
            {(fromAccount || toAccount) && (
              <div className="grid grid-cols-[1fr_36px_1fr] gap-x-2">
                <div>{renderBalance(fromAccount)}</div>
                <div />
                <div>{renderBalance(toAccount)}</div>
              </div>
            )}

            {fromAccount && !isEquityFrom && (
              <InsufficientBalanceWarning
                balance={fromBalance}
                amount={parsedAmount}
                currency={fromCurrencyCode}
              />
            )}
          </div>

          {/* Row 2: Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="postingDate">
                {t("date")} <span className="text-destructive">*</span>
              </Label>
              <DateInput
                id="postingDate"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">
                {t("amount")}
                {fromCurrency ? ` (${fromCurrency})` : ""}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <NumberInput
                id="amount"
                value={amount ? parseFloat(amount) : undefined}
                onChange={(v) => setAmount(String(v))}
                min={0}
                decimals={0}
                placeholder="0"
              />
            </div>
          </div>

          {/* Row 3: Exchange Rate — compact 2-col, shown only when currencies differ */}
          {isExchange && (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="exchangeRate" className="text-xs">
                    {t("rate")}
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      1 {baseCurrency} =
                    </span>
                    <Input
                      id="exchangeRate"
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

                {/* Received */}
                <div className="space-y-1.5">
                  <Label htmlFor="receivedInput" className="text-xs">
                    {t("received")} ({receivedCurrency})
                  </Label>
                  <Input
                    id="receivedInput"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={effectiveReceivedInput}
                    onChange={(e) => handleReceivedChange(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Conversion summary */}
              {parsedAmount > 0 && parseFloat(effectiveReceivedInput) > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {formatNumber(parsedAmount, 2)}&nbsp;{fromCurrency}
                  <span className="mx-1.5 opacity-40">→</span>
                  {formatNumber(parseFloat(effectiveReceivedInput), 2)}&nbsp;{toCurrency}
                </p>
              )}
            </div>
          )}

          {/* Row 4: Memo */}
          <div className="space-y-1.5">
            <Label htmlFor="memo">{t("memo")}</Label>
            <Textarea
              id="memo"
              placeholder={t("memoPlaceholder")}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={1}
            />
          </div>

          {/* Row 5: Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
              {t("clear")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isInsufficientBalance}>
              {isSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {isSubmitting ? t("posting") : submitButtonText}
            </Button>
          </div>

          {/* Status bar */}
          <StatusBar type={status.type} message={status.message} />
        </CardContent>
      </Card>
    </form>
  );
};

export const TransferForm = forwardRef(TransferFormInner);
TransferForm.displayName = "TransferForm";
