"use client";

import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StatusBar } from "@/components/shared/status-bar";
import { EditModeBar } from "@/components/expenses/edit-mode-bar";
import { ExpenseLines } from "@/components/expenses/expense-lines";
import type { ExpenseLine } from "@/components/expenses/expense-lines";
import { useBankAccounts, useExpenseAccounts } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { cn } from "@/lib/utils";
import type { JournalEntry } from "@/types/journal-entry";

export interface WriteCheckFormData {
  postingDate: string;
  payee: string;
  paymentFrom: string;
  expenseLines: { account: string; amount: number }[];
  memo: string;
  editingName: string | null;
  editingDocstatus: number | null;
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
  return { id: crypto.randomUUID(), account: "", amount: "" };
}

const WriteCheckFormInner: React.ForwardRefRenderFunction<
  WriteCheckFormHandle,
  WriteCheckFormProps
> = ({ onSubmit, onLoadEntry, isSubmitting, onOpenNewAccount }, ref) => {
  const { company } = useCompanyStore();
  const { data: bankAccounts = [] } = useBankAccounts(company);
  const { data: expenseAccounts = [] } = useExpenseAccounts(company);

  const [postingDate, setPostingDate] = useState(getToday);
  const [payee, setPayee] = useState("");
  const [paymentFrom, setPaymentFrom] = useState("");
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
    makeDefaultLine(),
  ]);
  const [memo, setMemo] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDocstatus, setEditingDocstatus] = useState<number | null>(null);

  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });

  const resetForm = useCallback(() => {
    setPostingDate(getToday());
    setPayee("");
    setPaymentFrom("");
    setExpenseLines([makeDefaultLine()]);
    setMemo("");
    setEditingName(null);
    setEditingDocstatus(null);
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

        // Parse payee from user_remark
        const remark = entry.user_remark || "";
        if (remark.startsWith("Paid to ")) {
          // Extract payee — everything after "Paid to " until a newline or " | "
          const afterPrefix = remark.slice("Paid to ".length);
          const pipeIdx = afterPrefix.indexOf(" | ");
          const newlineIdx = afterPrefix.indexOf("\n");
          let endIdx = afterPrefix.length;
          if (pipeIdx !== -1) endIdx = Math.min(endIdx, pipeIdx);
          if (newlineIdx !== -1) endIdx = Math.min(endIdx, newlineIdx);
          setPayee(afterPrefix.slice(0, endIdx).trim());

          // Extract memo — everything after " | "
          if (pipeIdx !== -1) {
            setMemo(afterPrefix.slice(pipeIdx + 3).trim());
          } else {
            setMemo("");
          }
        } else {
          setPayee("");
          setMemo(remark);
        }

        // Parse accounts: credit account is paymentFrom, debit accounts are expense lines
        const creditAccount = entry.accounts.find(
          (a) =>
            a.credit_in_account_currency &&
            a.credit_in_account_currency > 0
        );
        if (creditAccount) {
          setPaymentFrom(creditAccount.account);
        }

        const debitAccounts = entry.accounts.filter(
          (a) =>
            a.debit_in_account_currency &&
            a.debit_in_account_currency > 0
        );
        if (debitAccounts.length > 0) {
          setExpenseLines(
            debitAccounts.map((a) => ({
              id: crypto.randomUUID(),
              account: a.account,
              amount: String(a.debit_in_account_currency || 0),
            }))
          );
        } else {
          setExpenseLines([makeDefaultLine()]);
        }

        setEditingName(entry.name);
        setEditingDocstatus(entry.docstatus);
        setStatus({ type: null, message: "" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load entry";
        setStatus({ type: "error", message });
      }
    },
    [onLoadEntry]
  );

  useImperativeHandle(ref, () => ({
    loadEntryForEdit,
    cancelEditMode,
  }));

  const validate = (): string | null => {
    if (!postingDate) return "Date is required";
    if (!paymentFrom) return "Payment from account is required";

    const validLines = expenseLines.filter(
      (l) => l.account && parseFloat(l.amount) > 0
    );
    if (validLines.length === 0) {
      return "At least one expense line with account and positive amount is required";
    }

    const total = validLines.reduce(
      (sum, l) => sum + parseFloat(l.amount),
      0
    );
    if (total <= 0) return "Total must be greater than 0";

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
        }));

      await onSubmit({
        postingDate,
        payee,
        paymentFrom,
        expenseLines: validLines,
        memo,
        editingName,
        editingDocstatus,
      });

      setStatus({ type: "success", message: "Entry posted successfully" });
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to post entry";
      setStatus({ type: "error", message });
    }
  };

  const submitButtonText = (() => {
    if (!editingName) return "Post Entry";
    if (editingDocstatus === 1) return "Amend Entry";
    return "Update Entry";
  })();

  return (
    <form onSubmit={handleSubmit}>
      <Card className="overflow-hidden pt-0">
        {/* Green accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-400" />

        <CardContent className="space-y-5 pt-6">
          <EditModeBar
            editingName={editingName}
            editingDocstatus={editingDocstatus}
            onCancel={cancelEditMode}
          />

          {/* Row: Date + Payee */}
          <div className="flex gap-4">
            <div className="w-40 shrink-0 space-y-1.5">
              <Label htmlFor="postingDate">Date</Label>
              <Input
                id="postingDate"
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                required
              />
            </div>
            <div className="flex-1 space-y-1.5">
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

          {/* Row: Payment From */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentFrom">Payment From</Label>
            <select
              id="paymentFrom"
              value={paymentFrom}
              onChange={(e) => setPaymentFrom(e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !paymentFrom && "text-muted-foreground"
              )}
            >
              <option value="">Select bank / cash account</option>
              {bankAccounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>

          <Separator />

          {/* Expense Lines */}
          <ExpenseLines
            lines={expenseLines}
            expenseAccounts={expenseAccounts}
            onUpdate={setExpenseLines}
            onOpenNewAccount={onOpenNewAccount}
          />

          {/* Memo */}
          <div className="space-y-1.5">
            <Label htmlFor="memo">Memo</Label>
            <Textarea
              id="memo"
              placeholder="Optional notes..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Clear
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
