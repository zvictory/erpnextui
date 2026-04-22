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
import { InsufficientBalanceWarning } from "@/components/shared/insufficient-balance-warning";
import { ExpenseLines } from "@/components/expenses/expense-lines";
import type { ExpenseLine } from "@/components/expenses/expense-lines";
import { useBankAccountsWithCurrency, useExpenseAccountsWithCurrency } from "@/hooks/use-accounts";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useCompanyStore } from "@/stores/company-store";
import { useCompanies } from "@/hooks/use-companies";
import { cn, formatCurrency } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import type { JournalEntry } from "@/types/journal-entry";

export interface WriteCheckFormData {
  postingDate: string;
  payee: string;
  paymentFrom: string;
  expenseLines: { account: string; amount: number; memo: string }[];
  editingName: string | null;
  editingDocstatus: number | null;
  exchangeRate: number;
  convertedTotal: number;
  isMultiCurrency: boolean;
}

export interface WriteCheckFormHandle {
  loadEntryForEdit: (name: string) => Promise<void>;
  cancelEditMode: () => void;
}

interface WriteCheckFormProps {
  onSubmit: (data: WriteCheckFormData) => Promise<void>;
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

function makeDefaultLine(): ExpenseLine {
  return { id: crypto.randomUUID(), account: "", amount: "", memo: "" };
}

const WriteCheckFormInner: React.ForwardRefRenderFunction<
  WriteCheckFormHandle,
  WriteCheckFormProps
> = ({ onSubmit, onLoadEntry, isSubmitting, onOpenNewAccount }, ref) => {
  const t = useTranslations("expenses");
  const { company } = useCompanyStore();
  const {
    data: bankAccounts = [],
    isLoading: isAccountsLoading,
    isError: isAccountsError,
  } = useBankAccountsWithCurrency(company);
  const { data: expenseAccounts = [] } = useExpenseAccountsWithCurrency(company);
  const { data: companies } = useCompanies();

  const companyCurrency = companies?.find((c) => c.name === company)?.default_currency ?? "";
  const STRONG = ["USD", "EUR", "GBP", "CNY", "RUB"];

  const [postingDate, setPostingDate] = useState(getToday);
  const [payee, setPayee] = useState("");
  const [paymentFrom, setPaymentFrom] = useState("");
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([makeDefaultLine()]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDocstatus, setEditingDocstatus] = useState<number | null>(null);

  // Exchange state
  const [rateInput, setRateInput] = useState("1");
  const [convertedTotal, setConvertedTotal] = useState("");

  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });

  // Derived currency detection
  const paymentCurrency = bankAccounts.find((a) => a.name === paymentFrom)?.account_currency ?? "";

  // Multi-currency when payee account currency differs from company default
  const isMultiCurrency =
    paymentCurrency !== "" && companyCurrency !== "" && paymentCurrency !== companyCurrency;

  const foreignCurrency = isMultiCurrency ? paymentCurrency : null;

  // When company is the stronger currency (e.g. USD), show "1 USD = ? UZS" not "1 UZS = 0.000083 USD"
  const isRateInverted =
    isMultiCurrency &&
    STRONG.includes(companyCurrency) &&
    !STRONG.includes(foreignCurrency ?? "");

  // Filter expense accounts to match the payee account's currency
  const filteredExpenseAccounts = paymentCurrency
    ? expenseAccounts.filter((a) => a.account_currency === paymentCurrency)
    : expenseAccounts;

  // When payee currency changes, clear expense accounts that don't match
  useEffect(() => {
    if (!paymentCurrency) return;
    setExpenseLines((prev) =>
      prev.map((line) => {
        if (!line.account) return line;
        const acctCurrency = expenseAccounts.find((a) => a.name === line.account)?.account_currency;
        if (acctCurrency && acctCurrency !== paymentCurrency) {
          return { ...line, account: "" };
        }
        return line;
      }),
    );
  }, [paymentCurrency, expenseAccounts]);

  // Auto-fetch exchange rate for the selected date
  const { data: fetchedRate } = useExchangeRate(
    foreignCurrency ?? "",
    companyCurrency,
    postingDate,
  );

  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);
  useEffect(() => {
    if (fetchedRate && fetchedRate > 0 && !rateManuallyEdited && !editingName) {
      // When inverted, show 1/rate so label reads "1 USD = 12,060 UZS" not "1 UZS = 0.000083 USD"
      setRateInput(String(isRateInverted ? 1 / fetchedRate : fetchedRate));
    }
  }, [fetchedRate, rateManuallyEdited, editingName, isRateInverted]);

  // Reset manual edit flag when currencies or date change
  useEffect(() => {
    setRateManuallyEdited(false);
  }, [foreignCurrency, companyCurrency, postingDate]);

  // canonicalRate = foreign → company (what ERPNext exchange_rate expects).
  // When isRateInverted, rateInput shows "UZS per 1 USD" so canonical = 1/display.
  const canonicalRate = useMemo(() => {
    const display = parseFloat(rateInput) || 1;
    return isRateInverted ? 1 / display : display;
  }, [rateInput, isRateInverted]);

  const expenseTotal = expenseLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  // Linking helpers — unified: convertedTotal = expenseTotal × canonicalRate
  // Round to 2 decimal places for accounting precision
  function roundTo2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  function handleRateInputChange(value: string) {
    setRateInput(value);
    setRateManuallyEdited(true);
    const display = parseFloat(value) || 1;
    const canonical = isRateInverted ? 1 / display : display;
    if (expenseTotal > 0) {
      setConvertedTotal(String(roundTo2(expenseTotal * canonical)));
    }
  }

  function handleConvertedTotalChange(value: string) {
    setConvertedTotal(value);
    setRateManuallyEdited(true);
    const ct = parseFloat(value);
    if (expenseTotal > 0 && ct > 0) {
      const canonical = ct / expenseTotal;
      setRateInput(String(isRateInverted ? 1 / canonical : canonical));
    }
  }

  // When expense lines change, recompute converted total (rate stays fixed)
  useEffect(() => {
    if (isMultiCurrency && expenseTotal > 0 && canonicalRate > 0) {
      setConvertedTotal(String(roundTo2(expenseTotal * canonicalRate)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiCurrency, expenseTotal]);

  const resetForm = useCallback(() => {
    setPostingDate(getToday());
    setPayee("");
    setPaymentFrom("");
    setExpenseLines([makeDefaultLine()]);
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

        // Parse payee + per-line memos from user_remark
        // Format: "[Expense] Paid to X | memo1; memo2" or "[Expense] memo1; memo2"
        const rawRemark = entry.user_remark || "";
        const remark = rawRemark.startsWith("[Expense] ")
          ? rawRemark.slice("[Expense] ".length)
          : rawRemark;

        let memosStr = "";
        if (remark.startsWith("Paid to ")) {
          const afterPrefix = remark.slice("Paid to ".length);
          const pipeIdx = afterPrefix.indexOf(" | ");
          const newlineIdx = afterPrefix.indexOf("\n");
          let endIdx = afterPrefix.length;
          if (pipeIdx !== -1) endIdx = Math.min(endIdx, pipeIdx);
          if (newlineIdx !== -1) endIdx = Math.min(endIdx, newlineIdx);
          setPayee(afterPrefix.slice(0, endIdx).trim());
          if (pipeIdx !== -1) {
            memosStr = afterPrefix.slice(pipeIdx + 3).trim();
          }
        } else {
          setPayee("");
          memosStr = remark;
        }
        const lineMemos = memosStr ? memosStr.split("; ") : [];

        // Parse accounts: credit account is paymentFrom, debit accounts are expense lines
        const creditAccount = entry.accounts.find(
          (a) => a.credit_in_account_currency && a.credit_in_account_currency > 0,
        );
        if (creditAccount) {
          setPaymentFrom(creditAccount.account);
        }

        const debitAccounts = entry.accounts.filter(
          (a) => a.debit_in_account_currency && a.debit_in_account_currency > 0,
        );
        if (debitAccounts.length > 0) {
          // Prefer per-line user_remark (new format), fall back to parsed parent memos (legacy)
          const hasPerLineMemos = debitAccounts.some((a) => a.user_remark);
          setExpenseLines(
            debitAccounts.map((a, i) => ({
              id: crypto.randomUUID(),
              account: a.account,
              amount: String(a.debit_in_account_currency || 0),
              memo: hasPerLineMemos ? (a.user_remark ?? "") : (lineMemos[i] ?? ""),
            })),
          );
        } else {
          setExpenseLines([makeDefaultLine()]);
        }

        // Restore exchange rate if multi-currency
        const loadedPaymentCurrency =
          bankAccounts.find((a) => a.name === creditAccount?.account)?.account_currency ?? "";

        if (loadedPaymentCurrency && loadedPaymentCurrency !== companyCurrency) {
          // Multi-currency: payee is foreign currency, all rows share the same rate
          const foreignRow = entry.accounts.find((a) => a.exchange_rate && a.exchange_rate !== 1);
          if (foreignRow?.exchange_rate) {
            const R = foreignRow.exchange_rate; // canonical: foreign → company
            const isInv =
              STRONG.includes(companyCurrency) && !STRONG.includes(loadedPaymentCurrency);
            setRateInput(String(isInv ? 1 / R : R));

            // Expense amounts are stored in payee currency — no reverse-conversion needed
            const total = debitAccounts.reduce((s, a) => s + (a.debit_in_account_currency || 0), 0);
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

  const paymentFromData = bankAccounts.find((a) => a.name === paymentFrom);
  const paymentFromBalance = paymentFromData?.balance ?? 0;
  const paymentFromCurrency = paymentFromData?.account_currency ?? "";
  const checkAmount = isMultiCurrency ? parseFloat(convertedTotal) || 0 : expenseTotal;
  const isInsufficientBalance =
    !!paymentFrom && checkAmount > 0 && checkAmount > paymentFromBalance;

  const validate = (): string | null => {
    if (!postingDate) return "Date is required";
    if (!paymentFrom) return "Payment from account is required";

    const validLines = expenseLines.filter((l) => l.account && parseFloat(l.amount) > 0);
    if (validLines.length === 0) {
      return "At least one expense line with account and positive amount is required";
    }

    const total = validLines.reduce((sum, l) => sum + parseFloat(l.amount), 0);
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

    if (isInsufficientBalance) return "Insufficient balance in payment account";

    const missingMemo = validLines.find((l) => !l.memo.trim());
    if (missingMemo) return "Each expense line must have a description";

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
      const validLines = expenseLines
        .filter((l) => l.account && parseFloat(l.amount) > 0)
        .map((l) => ({
          account: l.account,
          amount: parseFloat(l.amount),
          memo: l.memo.trim(),
        }));

      await onSubmit({
        postingDate,
        payee,
        paymentFrom,
        expenseLines: validLines,
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
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-400" />

        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base">Write Check</CardTitle>
          <CardDescription>Record a payment or expense</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <EditModeBar
            editingName={editingName}
            editingDocstatus={editingDocstatus}
            onCancel={cancelEditMode}
          />

          {/* Row: Date + Payee */}
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
              <Label htmlFor="payee">Payee</Label>
              <Input
                id="payee"
                type="text"
                placeholder="Who was this paid to?"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
              />
            </div>
          </div>

          {/* Payment From */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentFrom">
              {t("payeeAccount")} <span className="text-destructive">*</span>
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
            {paymentFrom && (
              <InsufficientBalanceWarning
                balance={paymentFromBalance}
                amount={checkAmount}
                currency={paymentFromCurrency}
              />
            )}
          </div>

          {/* Expense Lines */}
          <ExpenseLines
            lines={expenseLines}
            expenseAccounts={filteredExpenseAccounts}
            onUpdate={setExpenseLines}
            onOpenNewAccount={onOpenNewAccount}
            hideTotal={isMultiCurrency}
          />

          {/* Exchange rate — compact 2-col */}
          {isMultiCurrency && (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("totalAmount")}</span>
                <span className="font-mono font-medium text-foreground">
                  {formatNumber(expenseTotal, 2)} {paymentCurrency}
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
                      1&nbsp;{isRateInverted ? companyCurrency : (foreignCurrency ?? companyCurrency)} =
                    </span>
                    <Input
                      id="exchangeRate"
                      type="number"
                      step="any"
                      min="0"
                      value={rateInput}
                      onChange={(e) => handleRateInputChange(e.target.value)}
                      className="h-8 min-w-0"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {isRateInverted ? (foreignCurrency ?? "") : companyCurrency}
                    </span>
                  </div>
                </div>

                {/* Total in company currency */}
                <div className="space-y-1.5">
                  <Label htmlFor="convertedTotal" className="text-xs">
                    Total ({companyCurrency})
                  </Label>
                  <Input
                    id="convertedTotal"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={convertedTotal}
                    onChange={(e) => handleConvertedTotalChange(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Conversion summary */}
              {expenseTotal > 0 && parseFloat(convertedTotal) > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {formatNumber(expenseTotal, 2)}&nbsp;
                  {paymentCurrency}
                  <span className="mx-1.5 opacity-40">→</span>
                  {formatNumber(parseFloat(convertedTotal), 2)}&nbsp;{companyCurrency}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Clear
            </Button>
            <Button type="submit" disabled={isSubmitting || isInsufficientBalance}>
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

export const WriteCheckForm = forwardRef(WriteCheckFormInner);
WriteCheckForm.displayName = "WriteCheckForm";
