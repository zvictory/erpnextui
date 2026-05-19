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
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { useTransferAccountsWithCurrency, useCurrencyMap } from "@/hooks/use-accounts";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useCompanyStore } from "@/stores/company-store";
import { useCompanies } from "@/hooks/use-companies";
import { cn, formatCurrency } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { getCurrencyDecimals } from "@/lib/utils/multi-currency";
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
  // Company-currency anchors. ERPNext recomputes debit/credit from
  // (amount × rate) otherwise, which loses precision when the rate has
  // sub-cent significance (e.g. UZS rate 12200.001952 truncated to 12200).
  fromBaseAmount: number,
  toBaseAmount: number,
  fromCurrency?: string,
  toCurrency?: string,
): JournalEntryAccount[] {
  return [
    {
      doctype: "Journal Entry Account",
      account: fromAccount,
      credit_in_account_currency: creditAmount,
      credit: fromBaseAmount,
      exchange_rate: fromExRate,
      ...(fromCurrency ? { account_currency: fromCurrency } : {}),
    },
    {
      doctype: "Journal Entry Account",
      account: toAccount,
      debit_in_account_currency: debitAmount,
      debit: toBaseAmount,
      exchange_rate: toExRate,
      ...(toCurrency ? { account_currency: toCurrency } : {}),
    },
  ];
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
  // User's explicit picker override for which currency the typed amount is
  // denominated in. Empty string = "fall back to the from-account's currency".
  // Effective `amountCurrency` is derived below so it stays valid across
  // pair changes (e.g., after the ⇄ swap or when From/To accounts change).
  const [pickedAmountCurrency, setPickedAmountCurrency] = useState<string>("");
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

  // Auto-fetch exchange rate for the selected date
  const { data: fetchedRate } = useExchangeRate(baseCurrency, quoteCurrency, postingDate);

  // Currency symbol lookup (e.g. "USD" → "$", "UZS" → "сўм")
  const { data: currencyMap } = useCurrencyMap();
  const getSym = useCallback(
    (code: string) => {
      const e = currencyMap?.get(code);
      return e ? { symbol: e.symbol, onRight: e.onRight } : { symbol: code, onRight: false };
    },
    [currencyMap],
  );
  const fromSym = getSym(fromCurrency);
  const toSym = getSym(toCurrency);
  const baseSym = getSym(baseCurrency);
  const quoteSym = getSym(quoteCurrency);
  const companySym = getSym(companyCurrency);

  // For cross-foreign transfers (neither side = company currency), fetch the
  // from→company rate so we can display the base-currency equivalent.
  const needsBaseEquivalent =
    isExchange && fromCurrency !== companyCurrency && toCurrency !== companyCurrency;
  const { data: fromToCompanyRate } = useExchangeRate(
    needsBaseEquivalent ? fromCurrency : "",
    needsBaseEquivalent ? companyCurrency : "",
    postingDate,
  );

  // Tracks whether user manually overrode the auto-fetched rate. Stays state
  // (not ref) because effectiveRateStr is read during render.
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);

  // Reset manual-edit flag when currencies or date change (so the fresh fetch wins)
  useEffect(() => {
    setRateManuallyEdited(false);
  }, [baseCurrency, quoteCurrency, postingDate]);

  // Effective picker currency. Derived (not state-in-effect) so that pair
  // changes — including the ⇄ swap that flips From/To — automatically validate
  // the user's pick. If the picked currency is still part of the new pair we
  // honor it (preserving "I'm thinking in UZS" across swaps); otherwise we
  // fall back to the from-account's currency.
  const pickIsValidForPair =
    !!pickedAmountCurrency &&
    (pickedAmountCurrency === fromCurrency || pickedAmountCurrency === toCurrency);
  const amountCurrency =
    !fromCurrency && !toCurrency
      ? ""
      : pickIsValidForPair
        ? pickedAmountCurrency
        : fromCurrency || toCurrency;

  const typedAmount = parseFloat(amount) || 0;

  // Effective rate: fetched value wins unless the user manually overrode or we're editing a saved entry
  const effectiveRateStr =
    !rateManuallyEdited && !editingName && fetchedRate && fetchedRate > 0
      ? rateStr(fetchedRate)
      : rate;
  const parsedRate = parseFloat(effectiveRateStr) || 1;

  // Express the typed amount in BOTH currencies of the pair. Rate r is oriented
  // as "1 baseCurrency = r quoteCurrency" (per getDisplayPair). So:
  //   amount-in-base  = (picker=base)  ? typed : typed / r
  //   amount-in-quote = (picker=quote) ? typed : typed * r
  // For non-exchange transfers both legs are simply the typed amount.
  const baseAmountVal = !isExchange
    ? typedAmount
    : amountCurrency === baseCurrency
      ? typedAmount
      : parsedRate > 0
        ? typedAmount / parsedRate
        : 0;
  const quoteAmountVal = !isExchange
    ? typedAmount
    : amountCurrency === quoteCurrency
      ? typedAmount
      : typedAmount * parsedRate;

  // Map onto the From/To legs (which way the Journal Entry rows go is purely
  // determined by the From/To account selectors; amountCurrency is a UX layer).
  const fromAmountVal = !isExchange
    ? typedAmount
    : fromCurrency === baseCurrency
      ? baseAmountVal
      : quoteAmountVal;
  const toAmountVal = !isExchange
    ? typedAmount
    : toCurrency === baseCurrency
      ? baseAmountVal
      : quoteAmountVal;

  // The "≈" derived display under the input: whichever pair currency wasn't picked.
  const derivedCurrency = !isExchange
    ? ""
    : amountCurrency === baseCurrency
      ? quoteCurrency
      : baseCurrency;
  const derivedAmountVal = !isExchange
    ? 0
    : amountCurrency === baseCurrency
      ? quoteAmountVal
      : baseAmountVal;

  // Auto-correct the rate input to the EFFECTIVE rate that reconciles the
  // derived leg AFTER currency-precision rounding. The GL stores the derived
  // leg at its currency precision (USD 2 dp, UZS 0 dp), so `typed × rate`
  // shaves sub-cent amounts unless the rate itself is back-computed from the
  // rounded derived amount. Mirrors the server-side anchor in handleSubmit.
  useEffect(() => {
    if (!isExchange) return;
    if (typedAmount <= 0 || parsedRate <= 0) return;
    if (!derivedCurrency || !baseCurrency) return;

    const id = window.setTimeout(() => {
      const decimals = getCurrencyDecimals(derivedCurrency);
      const factor = 10 ** decimals;
      const roundedDerived = Math.round(derivedAmountVal * factor) / factor;
      if (roundedDerived <= 0) return;

      const effective =
        amountCurrency === baseCurrency
          ? roundedDerived / typedAmount
          : typedAmount / roundedDerived;

      const nextStr = rateStr(effective);
      if (nextStr !== rateStr(parsedRate)) {
        setRate(nextStr);
        setRateManuallyEdited(true);
      }
    }, 350);

    return () => window.clearTimeout(id);
  }, [
    isExchange,
    typedAmount,
    parsedRate,
    amountCurrency,
    derivedAmountVal,
    derivedCurrency,
    baseCurrency,
  ]);

  const handleSwap = useCallback(() => {
    setFromAccount((prev) => {
      const oldFrom = prev;
      setToAccount(oldFrom);
      return toAccount;
    });
    // amountCurrency intentionally preserved — user's "I was typing UZS" survives the flip
  }, [toAccount]);

  const handleRateChange = useCallback((value: string) => {
    setRate(value);
    setRateManuallyEdited(true);
    // No two-way sync needed: the typed amount stays anchored; the derived
    // (≈) value just re-computes from the new rate on next render.
  }, []);

  const resetForm = useCallback(() => {
    setPostingDate(getToday());
    setFromAccount("");
    setToAccount("");
    setAmount("");
    setRate("1");
    setPickedAmountCurrency("");
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

        // Re-hydrate the typed amount + currency from the from-side leg. The
        // to-side becomes the derived (≈) display automatically on next render.
        if (creditAcc?.credit_in_account_currency) {
          setAmount(String(creditAcc.credit_in_account_currency));
          const loadedFromCur =
            creditAcc.account_currency ||
            transferAccounts.find((a) => a.name === creditAcc.account)?.account_currency ||
            "";
          if (loadedFromCur) setPickedAmountCurrency(loadedFromCur);
        }

        // Restore exchange rate if accounts have different currencies
        // Prefer account_currency from JE row itself; fall back to transferAccounts lookup
        const loadedFromCurrency =
          creditAcc?.account_currency ||
          transferAccounts.find((a) => a.name === creditAcc?.account)?.account_currency ||
          "";
        const loadedToCurrency =
          debitAcc?.account_currency ||
          transferAccounts.find((a) => a.name === debitAcc?.account)?.account_currency ||
          "";

        if (loadedFromCurrency && loadedToCurrency && loadedFromCurrency !== loadedToCurrency) {
          const credit = creditAcc?.credit_in_account_currency ?? 0;
          const debit = debitAcc?.debit_in_account_currency ?? 0;
          if (credit > 0 && debit > 0) {
            // Derive rate from actual amounts — avoids wrong exchange_rate in legacy entries.
            // Rate is expressed as "1 baseCurrency = X quoteCurrency" matching display convention.
            const [computedBase] = getDisplayPair(
              loadedFromCurrency,
              loadedToCurrency,
              companyCurrency,
            );
            const loadedRate =
              computedBase !== loadedFromCurrency
                ? credit / debit // base is to-side (e.g. USD received): rate = UZS/USD
                : debit / credit; // base is from-side (e.g. USD sent): rate = UZS/USD
            setRate(rateStr(loadedRate));
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
  // Compare the from-leg amount (in from-currency) against the balance — works
  // even when the user typed in the OTHER currency, because fromAmountVal is
  // the converted equivalent.
  const isInsufficientBalance =
    !!fromAccount && !isEquityFrom && fromAmountVal > 0 && fromAmountVal > fromBalance;

  const validate = (): string | null => {
    if (!postingDate) return "Date is required";
    if (!fromAccount) return "Transfer From account is required";
    if (!toAccount) return "Transfer To account is required";
    if (fromAccount === toAccount) return "From and To accounts must be different";
    if (typedAmount <= 0) return "Amount must be greater than 0";
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
      // Both legs come from the derived values, no matter which currency the user typed in.
      const fromLegAmount = fromAmountVal;
      const toLegAmount = toAmountVal;

      // Anchor the entire transfer to a SINGLE company-currency total.
      // Both legs use the same anchor so the JE balances by construction,
      // and ERPNext's set_amounts_in_company_currency() becomes a no-op
      // (no rate truncation can shave UZS off the ledger).
      let baseTotal: number;
      if (!isExchange) {
        baseTotal = fromLegAmount;
      } else if (fromCurrency === companyCurrency) {
        baseTotal = fromLegAmount;
      } else if (toCurrency === companyCurrency) {
        baseTotal = toLegAmount;
      } else if (needsBaseEquivalent && fromToCompanyRate && fromToCompanyRate > 0) {
        baseTotal = fromLegAmount * fromToCompanyRate;
      } else {
        baseTotal = fromLegAmount * parsedRate;
      }

      // Per-leg rate = anchor / leg-currency-amount → preserves the user's
      // effective rate exactly when one leg is in company currency.
      const fromExRate = fromLegAmount > 0 ? baseTotal / fromLegAmount : 1;
      const toExRate = toLegAmount > 0 ? baseTotal / toLegAmount : 1;

      const accounts = buildTransferAccounts(
        fromAccount,
        toAccount,
        fromLegAmount,
        fromExRate,
        toLegAmount,
        toExRate,
        baseTotal,
        baseTotal,
        fromCurrency,
        toCurrency,
      );

      await onSubmit({
        postingDate,
        fromAccount,
        toAccount,
        amount: fromLegAmount,
        exchangeRate: parsedRate,
        convertedTotal: toLegAmount,
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
                        <SelectLabel className="text-xs text-muted-foreground">
                          Bank & Cash
                        </SelectLabel>
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
                        <SelectLabel className="text-xs text-muted-foreground">
                          Bank & Cash
                        </SelectLabel>
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
                amount={fromAmountVal}
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="amount">
                  {t("amountSent")}
                  {!isExchange && fromCurrency ? ` (${fromSym.symbol})` : ""}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {isExchange && fromCurrency && toCurrency && (
                  <ToggleGroup
                    type="single"
                    size="sm"
                    variant="outline"
                    value={amountCurrency}
                    onValueChange={(v) => {
                      if (v) setPickedAmountCurrency(v);
                    }}
                    aria-label={t("currencySent")}
                    className="h-7"
                  >
                    <ToggleGroupItem
                      value={fromCurrency}
                      className="h-7 px-2.5 text-xs"
                      aria-label={fromCurrency}
                    >
                      {fromSym.symbol}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value={toCurrency}
                      className="h-7 px-2.5 text-xs"
                      aria-label={toCurrency}
                    >
                      {toSym.symbol}
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </div>
              <MoneyInput
                id="amount"
                value={amount ? parseFloat(amount) : undefined}
                onChange={(v) => setAmount(String(v))}
                min={0}
                decimals={0}
                placeholder="0"
              />
            </div>
          </div>

          {/* Row 3: Exchange Rate + derived equivalent — shown only when currencies differ */}
          {isExchange && (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="exchangeRate" className="text-xs">
                  {t("rate")}
                </Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    1 {baseSym.symbol} =
                  </span>
                  <MoneyInput
                    id="exchangeRate"
                    value={parseFloat(effectiveRateStr)}
                    onChange={(v) => handleRateChange(String(v))}
                    min={0}
                    decimals={6}
                    className="h-8 min-w-0"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">{quoteSym.symbol}</span>
                </div>
              </div>

              {/* Derived equivalent — the amount in the OTHER currency */}
              {typedAmount > 0 && parsedRate > 0 && derivedCurrency && (
                <p className="text-xs text-center text-muted-foreground border-t pt-2">
                  <span className="opacity-60 mr-1">{t("equivalent")}</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(
                      derivedAmountVal,
                      getSym(derivedCurrency).symbol,
                      getSym(derivedCurrency).onRight,
                    )}
                  </span>
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

          {/* Transfer Summary — from→to detail block */}
          {fromAccount && toAccount && fromAmountVal > 0 && (
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{t("summary.from")}</span>
                <span className="font-medium truncate text-right">{fromAccount}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{t("summary.to")}</span>
                <span className="font-medium truncate text-right">{toAccount}</span>
              </div>
              <div className="border-t pt-1.5 flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {formatCurrency(fromAmountVal, fromSym.symbol, fromSym.onRight)}
                </span>
                <span className="opacity-50">→</span>
                <span className="font-semibold">
                  {formatCurrency(toAmountVal, toSym.symbol, toSym.onRight)}
                </span>
              </div>
              {isExchange && parsedRate > 0 && (
                <p className="text-[11px] text-muted-foreground text-right">
                  {t("summary.at")} 1 {baseSym.symbol} = {formatNumber(parsedRate, 6)}{" "}
                  {quoteSym.symbol}
                </p>
              )}
              {needsBaseEquivalent && fromToCompanyRate && fromToCompanyRate > 0 && (
                <p className="text-[11px] text-muted-foreground text-right">
                  {t("summary.baseEquivalent")}:{" "}
                  {formatCurrency(
                    fromAmountVal * fromToCompanyRate,
                    companySym.symbol,
                    companySym.onRight,
                  )}
                </p>
              )}
            </div>
          )}

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
