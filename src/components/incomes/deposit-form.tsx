"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/shared/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBar } from "@/components/shared/status-bar";
import { EditModeBar } from "@/components/expenses/edit-mode-bar";
import { IncomeLines } from "@/components/incomes/income-lines";
import type { IncomeLine } from "@/components/incomes/income-lines";
import {
  useBankAccountsWithCurrency,
  useIncomeAccountsWithCurrency,
  useCurrencyMap,
} from "@/hooks/use-accounts";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useCompanyStore } from "@/stores/company-store";
import { useCompanies } from "@/hooks/use-companies";
import { formatCurrency } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import type { JournalEntry } from "@/types/journal-entry";

export interface DepositFormData {
  postingDate: string;
  payer: string;
  paymentFrom: string;
  incomeLines: { account: string; amount: number; memo: string }[];
  editingName: string | null;
  editingDocstatus: number | null;
  exchangeRate: number;
  convertedTotal: number;
  isMultiCurrency: boolean;
}

export interface DepositFormHandle {
  loadEntryForEdit: (name: string) => Promise<void>;
  cancelEditMode: () => void;
}

/** Round to 6 decimal places and convert to string, eliminating IEEE 754 float noise. */
const rateStr = (n: number) => String(Math.round(n * 1e6) / 1e6);

interface DepositFormProps {
  onSubmit: (data: DepositFormData) => Promise<void>;
  onLoadEntry: (name: string) => Promise<JournalEntry>;
  isSubmitting: boolean;
  onOpenNewAccount: () => void;
}

function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeDefaultLine(): IncomeLine {
  return { id: crypto.randomUUID(), account: "", amount: 0, memo: "" };
}

const DepositFormInner: React.ForwardRefRenderFunction<
  DepositFormHandle,
  DepositFormProps
> = ({ onSubmit, onLoadEntry, isSubmitting, onOpenNewAccount }, ref) => {
  const t = useTranslations("income");
  const { company } = useCompanyStore();
  const {
    data: bankAccounts = [],
    isLoading: isAccountsLoading,
    isError: isAccountsError,
  } = useBankAccountsWithCurrency(company);
  const { data: incomeAccounts = [] } = useIncomeAccountsWithCurrency(company);
  const { data: companies } = useCompanies();

  const companyCurrency = companies?.find((c) => c.name === company)?.default_currency ?? "";
  const STRONG = ["USD", "EUR", "GBP", "CNY", "RUB"];

  // Currency symbol lookup
  const { data: currencyMap } = useCurrencyMap();
  const getSym = useCallback(
    (code: string) => {
      const e = currencyMap?.get(code);
      return e ? { symbol: e.symbol, onRight: e.onRight } : { symbol: code, onRight: false };
    },
    [currencyMap],
  );

  const [postingDate, setPostingDate] = useState(getToday);
  const [payer, setPayer] = useState("");
  const [paymentFrom, setPaymentFrom] = useState("");
  const [incomeLines, setIncomeLines] = useState<IncomeLine[]>([makeDefaultLine()]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDocstatus, setEditingDocstatus] = useState<number | null>(null);

  // Exchange state
  const [rateInput, setRateInput] = useState("1");
  const [convertedTotal, setConvertedTotal] = useState("");

  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });

  // Derived currency detection — paymentFrom is the deposit-into bank/cash account
  const paymentCurrency = bankAccounts.find((a) => a.name === paymentFrom)?.account_currency ?? "";

  const isMultiCurrency =
    paymentCurrency !== "" && companyCurrency !== "" && paymentCurrency !== companyCurrency;

  const foreignCurrency = isMultiCurrency ? paymentCurrency : null;

  const isRateInverted =
    isMultiCurrency &&
    STRONG.includes(companyCurrency) &&
    !STRONG.includes(foreignCurrency ?? "");

  // Filter income accounts to match deposit account's currency
  const filteredIncomeAccounts = paymentCurrency
    ? incomeAccounts.filter((a) => a.account_currency === paymentCurrency)
    : incomeAccounts;

  // When deposit currency changes, clear income lines whose account currency no longer matches
  useEffect(() => {
    if (!paymentCurrency) return;
    setIncomeLines((prev) =>
      prev.map((line) => {
        if (!line.account) return line;
        const acctCurrency = incomeAccounts.find((a) => a.name === line.account)?.account_currency;
        if (acctCurrency && acctCurrency !== paymentCurrency) {
          return { ...line, account: "" };
        }
        return line;
      }),
    );
  }, [paymentCurrency, incomeAccounts]);

  // Auto-fetch exchange rate for the selected date
  const { data: fetchedRate } = useExchangeRate(
    foreignCurrency ?? "",
    companyCurrency,
    postingDate,
  );

  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);
  useEffect(() => {
    if (fetchedRate && fetchedRate > 0 && !rateManuallyEdited && !editingName) {
      setRateInput(rateStr(isRateInverted ? 1 / fetchedRate : fetchedRate));
    }
  }, [fetchedRate, rateManuallyEdited, editingName, isRateInverted]);

  useEffect(() => {
    setRateManuallyEdited(false);
  }, [foreignCurrency, companyCurrency, postingDate]);

  const canonicalRate = useMemo(() => {
    const display = parseFloat(rateInput) || 1;
    return isRateInverted ? 1 / display : display;
  }, [rateInput, isRateInverted]);

  const incomeTotal = incomeLines.reduce((sum, l) => sum + l.amount, 0);

  function roundTo2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  function handleRateInputChange(value: string) {
    setRateInput(value);
    setRateManuallyEdited(true);
    const display = parseFloat(value) || 1;
    const canonical = isRateInverted ? 1 / display : display;
    if (incomeTotal > 0) {
      setConvertedTotal(String(roundTo2(incomeTotal * canonical)));
    }
  }

  function handleConvertedTotalChange(value: string) {
    setConvertedTotal(value);
    setRateManuallyEdited(true);
    const ct = parseFloat(value);
    if (incomeTotal > 0 && ct > 0) {
      const canonical = ct / incomeTotal;
      setRateInput(rateStr(isRateInverted ? 1 / canonical : canonical));
    }
  }

  useEffect(() => {
    if (isMultiCurrency && incomeTotal > 0 && canonicalRate > 0) {
      setConvertedTotal(String(roundTo2(incomeTotal * canonicalRate)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiCurrency, incomeTotal]);

  const resetForm = useCallback(() => {
    setPostingDate(getToday());
    setPayer("");
    setPaymentFrom("");
    setIncomeLines([makeDefaultLine()]);
    setEditingName(null);
    setEditingDocstatus(null);
    setRateInput("1");
    setConvertedTotal("");
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

        // Parse payer + per-line memos from user_remark
        // Format: "[Income] Received from X | memo1; memo2" or "[Income] memo1; memo2"
        const rawRemark = entry.user_remark || "";
        const remark = rawRemark.startsWith("[Income] ")
          ? rawRemark.slice("[Income] ".length)
          : rawRemark;

        let memosStr = "";
        if (remark.startsWith("Received from ")) {
          const afterPrefix = remark.slice("Received from ".length);
          const pipeIdx = afterPrefix.indexOf(" | ");
          const newlineIdx = afterPrefix.indexOf("\n");
          let endIdx = afterPrefix.length;
          if (pipeIdx !== -1) endIdx = Math.min(endIdx, pipeIdx);
          if (newlineIdx !== -1) endIdx = Math.min(endIdx, newlineIdx);
          setPayer(afterPrefix.slice(0, endIdx).trim());
          if (pipeIdx !== -1) {
            memosStr = afterPrefix.slice(pipeIdx + 3).trim();
          }
        } else {
          setPayer("");
          memosStr = remark;
        }
        const lineMemos = memosStr ? memosStr.split("; ") : [];

        // Parse accounts: debit account is paymentFrom (cash/bank), credits are income lines
        const debitAccount = entry.accounts.find(
          (a) => a.debit_in_account_currency && a.debit_in_account_currency > 0,
        );
        if (debitAccount) {
          setPaymentFrom(debitAccount.account);
        }

        const creditAccounts = entry.accounts.filter(
          (a) => a.credit_in_account_currency && a.credit_in_account_currency > 0,
        );
        if (creditAccounts.length > 0) {
          const hasPerLineMemos = creditAccounts.some((a) => a.user_remark);
          setIncomeLines(
            creditAccounts.map((a, i) => ({
              id: crypto.randomUUID(),
              account: a.account,
              amount: a.credit_in_account_currency || 0,
              memo: hasPerLineMemos ? (a.user_remark ?? "") : (lineMemos[i] ?? ""),
            })),
          );
        } else {
          setIncomeLines([makeDefaultLine()]);
        }

        // Restore exchange rate if multi-currency
        const loadedPaymentCurrency =
          bankAccounts.find((a) => a.name === debitAccount?.account)?.account_currency ?? "";

        if (loadedPaymentCurrency && loadedPaymentCurrency !== companyCurrency) {
          const foreignRow = entry.accounts.find((a) => a.exchange_rate && a.exchange_rate !== 1);
          if (foreignRow?.exchange_rate) {
            const R = foreignRow.exchange_rate;
            const isInv =
              STRONG.includes(companyCurrency) && !STRONG.includes(loadedPaymentCurrency);
            setRateInput(rateStr(isInv ? 1 / R : R));

            const total = creditAccounts.reduce(
              (s, a) => s + (a.credit_in_account_currency || 0),
              0,
            );
            setConvertedTotal(String(roundTo2(total * R)));
          }
        } else {
          setRateInput("1");
          setConvertedTotal("");
        }

        setEditingName(entry.name);
        setEditingDocstatus(entry.docstatus);
        setStatus({ type: null, message: "" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load entry";
        setStatus({ type: "error", message });
      }
    },
    [onLoadEntry, bankAccounts, companyCurrency],
  );

  useImperativeHandle(ref, () => ({
    loadEntryForEdit,
    cancelEditMode,
  }));

  const validate = (): string | null => {
    if (!postingDate) return "Date is required";
    if (!paymentFrom) return "Deposit account is required";

    const validLines = incomeLines.filter((l) => l.account && l.amount > 0);
    if (validLines.length === 0) {
      return "At least one income line with account and positive amount is required";
    }

    const total = validLines.reduce((sum, l) => sum + l.amount, 0);
    if (total <= 0) return "Total must be greater than 0";

    if (isMultiCurrency && canonicalRate <= 0) {
      return "Exchange rate must be greater than 0";
    }
    if (isMultiCurrency) {
      const ct = parseFloat(convertedTotal);
      if (!ct || ct <= 0) {
        return "Converted total must be greater than 0";
      }
    }

    const missingMemo = validLines.find((l) => !l.memo.trim());
    if (missingMemo) return "Each income line must have a description";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      setStatus({ type: "error", message: error });
      return;
    }

    setStatus({ type: "loading", message: "Posting entry..." });

    try {
      const validLines = incomeLines
        .filter((l) => l.account && l.amount > 0)
        .map((l) => ({
          account: l.account,
          amount: l.amount,
          memo: l.memo.trim(),
        }));

      await onSubmit({
        postingDate,
        payer,
        paymentFrom,
        incomeLines: validLines,
        editingName,
        editingDocstatus,
        exchangeRate: isMultiCurrency ? canonicalRate : 1,
        convertedTotal: isMultiCurrency ? parseFloat(convertedTotal) || 0 : 0,
        isMultiCurrency: isMultiCurrency,
      });

      setStatus({ type: "success", message: "Entry posted successfully" });
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to post entry";
      setStatus({ type: "error", message });
    }
  };

  const submitButtonText = (() => {
    if (!editingName) return "Post Entry";
    if (editingDocstatus === 1) return "Amend Entry";
    return "Update Entry";
  })();

  function renderBalance(accountName: string) {
    if (!accountName) return null;
    if (isAccountsLoading) return <span className="text-xs text-muted-foreground">Loading...</span>;
    if (isAccountsError)
      return <span className="text-xs text-destructive">Balance unavailable</span>;
    const acc = bankAccounts.find((a) => a.name === accountName);
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
        {/* Accent bar — emerald→teal to visually distinguish from expense */}
        <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-400" />

        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>Record a deposit or non-sales income</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <EditModeBar
            editingName={editingName}
            editingDocstatus={editingDocstatus}
            onCancel={cancelEditMode}
          />

          {/* Row: Date + Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="postingDate">
                {t("postingDate")} <span className="text-destructive">*</span>
              </Label>
              <DateInput
                id="postingDate"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payer">{t("payer")}</Label>
              <Input
                id="payer"
                type="text"
                placeholder="Who deposited this?"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              />
            </div>
          </div>

          {/* Deposit To */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentFrom">
              {t("payerAccount")} <span className="text-destructive">*</span>
            </Label>
            <Select value={paymentFrom} onValueChange={setPaymentFrom}>
              <SelectTrigger id="paymentFrom">
                <SelectValue placeholder="Select bank / cash account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.name} value={acc.name}>
                    {acc.name} ({acc.account_currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderBalance(paymentFrom)}
          </div>

          {/* Income Lines */}
          <IncomeLines
            lines={incomeLines}
            incomeAccounts={filteredIncomeAccounts}
            onUpdate={setIncomeLines}
            onOpenNewAccount={onOpenNewAccount}
            hideTotal={isMultiCurrency}
          />

          {/* Exchange rate — compact 2-col */}
          {isMultiCurrency && (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("totalAmount")}</span>
                <span className="font-mono font-medium text-foreground">
                  {formatNumber(incomeTotal, 2)} {paymentCurrency}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="exchangeRate" className="text-xs">
                    Rate
                  </Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      1&nbsp;
                      {getSym(isRateInverted ? companyCurrency : (foreignCurrency ?? companyCurrency)).symbol}{" "}
                      =
                    </span>
                    <MoneyInput
                      id="exchangeRate"
                      value={parseFloat(rateInput)}
                      onChange={(v) => handleRateInputChange(String(v))}
                      min={0}
                      decimals={6}
                      className="h-8 min-w-0"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {getSym(isRateInverted ? (foreignCurrency ?? "") : companyCurrency).symbol}
                    </span>
                  </div>
                </div>

                {/* Total in company currency */}
                <div className="space-y-1.5">
                  <Label htmlFor="convertedTotal" className="text-xs">
                    Total ({getSym(companyCurrency).symbol})
                  </Label>
                  <MoneyInput
                    id="convertedTotal"
                    value={parseFloat(convertedTotal) || undefined}
                    onChange={(v) => handleConvertedTotalChange(String(v))}
                    min={0}
                    decimals={2}
                    placeholder="0.00"
                    className="h-8"
                  />
                </div>
              </div>

              {/* Conversion summary */}
              {incomeTotal > 0 && parseFloat(convertedTotal) > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {formatCurrency(
                    incomeTotal,
                    getSym(paymentCurrency).symbol,
                    getSym(paymentCurrency).onRight,
                  )}
                  <span className="mx-1.5 opacity-40">→</span>
                  {formatCurrency(
                    parseFloat(convertedTotal),
                    getSym(companyCurrency).symbol,
                    getSym(companyCurrency).onRight,
                  )}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Clear
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {isSubmitting ? "Posting..." : submitButtonText}
            </Button>
          </div>

          {/* Status bar */}
          <StatusBar type={status.type} message={status.message} />
        </CardContent>
      </Card>
    </form>
  );
};

export const DepositForm = forwardRef(DepositFormInner);
DepositForm.displayName = "DepositForm";
