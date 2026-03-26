"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  WriteCheckForm,
  type WriteCheckFormHandle,
  type WriteCheckFormData,
} from "@/components/expenses/write-check-form";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { HistoryPanel } from "@/components/expenses/history-panel";
import { useCompanyStore } from "@/stores/company-store";
import { frappe } from "@/lib/frappe-client";
import {
  useCreateAndSubmitJournalEntry,
  useAmendJournalEntry,
  useUpdateDraftAndSubmit,
} from "@/hooks/use-journal-entries";
import { useBankAccountsWithCurrency, useExpenseAccountsWithCurrency } from "@/hooks/use-accounts";
import { queryKeys } from "@/hooks/query-keys";
import { useCompanies } from "@/hooks/use-companies";
import { ensureMultiCurrencyEnabled } from "@/lib/multi-currency";
import type { AccountWithCurrency } from "@/types/account";
import type { JournalEntry, JournalEntryAccount } from "@/types/journal-entry";

/**
 * Round to 2 decimal places (accounting precision)
 */
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildAccounts(
  data: WriteCheckFormData,
  paymentCurrency: string,
  companyCurrency: string,
): JournalEntryAccount[] {
  if (!data.isMultiCurrency) {
    // Same-currency path — unchanged behavior
    const total = data.expenseLines.reduce((sum, l) => sum + l.amount, 0);
    const accounts: JournalEntryAccount[] = data.expenseLines.map((l) => ({
      doctype: "Journal Entry Account",
      account: l.account,
      debit_in_account_currency: roundTo2(l.amount),
    }));
    accounts.push({
      doctype: "Journal Entry Account",
      account: data.paymentFrom,
      credit_in_account_currency: roundTo2(total),
    });
    return accounts;
  }

  // Multi-currency path.
  // convertedTotal is the exact company-currency amount the user confirmed in the UI.
  // Using it directly (instead of total × R) avoids floating-point multiplication errors
  // and ensures debit == credit even when the rate is an irrational number.
  const total = data.expenseLines.reduce((s, l) => s + l.amount, 0);
  const ct = data.convertedTotal; // exact company-currency total
  // Derived rate: used only where ERPNext needs an explicit exchange_rate field.
  // convertedTotal / total gives the same value as data.exchangeRate but is
  // anchored to the confirmed company amount, ensuring consistency.
  const R = total > 0 ? ct / total : data.exchangeRate;

  if (paymentCurrency === companyCurrency) {
    // Bank=company (UZS), expense=foreign (USD).
    // • Expense rows: foreign amount + rate R → ERPNext computes company debit = amount × R.
    // • Payment row: exact company amount (ct) with rate 1 → no multiplication, no rounding error.
    const accounts: JournalEntryAccount[] = data.expenseLines.map((l) => ({
      doctype: "Journal Entry Account",
      account: l.account,
      debit_in_account_currency: l.amount,
      exchange_rate: R,
    }));
    accounts.push({
      doctype: "Journal Entry Account",
      account: data.paymentFrom,
      credit_in_account_currency: ct,
      exchange_rate: 1,
    });
    return accounts;
  } else {
    // Bank=foreign (USD), expense=company (UZS).
    // • Expense rows: company amount (amount × R, rounded) with rate 1 → no ERPNext multiplication.
    // • Payment row: exact foreign amount with rate R → ERPNext computes company credit = total × R = ct.
    const accounts: JournalEntryAccount[] = data.expenseLines.map((l) => ({
      doctype: "Journal Entry Account",
      account: l.account,
      debit_in_account_currency: roundTo2(l.amount * R),
      exchange_rate: 1,
    }));
    accounts.push({
      doctype: "Journal Entry Account",
      account: data.paymentFrom,
      credit_in_account_currency: total,
      exchange_rate: R,
    });
    return accounts;
  }
}

function buildRemark(payee: string, memo: string): string {
  if (memo) return memo;
  if (payee) return `Paid to ${payee}`;
  return "";
}

function collectCurrencies(
  data: WriteCheckFormData,
  bankAccounts: AccountWithCurrency[],
  expenseAccounts: AccountWithCurrency[],
): string[] {
  const paymentCurrency =
    bankAccounts.find((a) => a.name === data.paymentFrom)?.account_currency ?? "";
  const expenseCurrencies = data.expenseLines.map(
    (l) => expenseAccounts.find((a) => a.name === l.account)?.account_currency ?? "",
  );
  return [paymentCurrency, ...expenseCurrencies];
}

export default function WriteCheckPage() {
  const { company } = useCompanyStore();
  const formRef = useRef<WriteCheckFormHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const queryClient = useQueryClient();

  const createAndSubmit = useCreateAndSubmitJournalEntry();
  const amend = useAmendJournalEntry();
  const updateDraft = useUpdateDraftAndSubmit();
  const { data: bankAccounts } = useBankAccountsWithCurrency(company);
  const { data: expenseAccounts } = useExpenseAccountsWithCurrency(company);
  const { data: companies } = useCompanies();

  const handleSubmit = async (data: WriteCheckFormData) => {
    const paymentCurrency =
      bankAccounts?.find((a) => a.name === data.paymentFrom)?.account_currency ?? "";
    const companyCurr = companies?.find((c) => c.name === company)?.default_currency ?? "";
    const accounts = buildAccounts(data, paymentCurrency, companyCurr);
    const remark = buildRemark(data.payee, data.memo);

    setIsSubmitting(true);
    try {
      const currencies = collectCurrencies(data, bankAccounts ?? [], expenseAccounts ?? []);
      const multiCurrency = await ensureMultiCurrencyEnabled(company, currencies);

      // Branch: Edit draft (docstatus 0)
      if (data.editingName && data.editingDocstatus === 0) {
        const result = await updateDraft.mutateAsync({
          name: data.editingName,
          postingDate: data.postingDate,
          userRemark: remark,
          accounts,
          multiCurrency,
        });
        if (result.submitted) {
          toast.success(`Updated & submitted ${result.name}`);
        } else {
          toast.warning(`Saved ${result.name} but submit failed: ${result.error}`);
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.bankWithCurrency(company) });
        return;
      }

      // Branch: Amend submitted (docstatus 1)
      if (data.editingName && data.editingDocstatus === 1) {
        const result = await amend.mutateAsync({
          originalName: data.editingName,
          postingDate: data.postingDate,
          company,
          userRemark: remark,
          accounts,
          multiCurrency,
        });
        toast.success(`Cancelled ${result.originalName}. New draft: ${result.newName}`);
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.bankWithCurrency(company) });
        return;
      }

      // Branch: Create new
      const result = await createAndSubmit.mutateAsync({
        postingDate: data.postingDate,
        company,
        userRemark: remark,
        accounts,
        multiCurrency,
      });
      if (result.submitted) {
        toast.success(`Submitted ${result.name}`);
      } else {
        toast.warning(`Created ${result.name} as draft (submit failed: ${result.error})`);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.bankWithCurrency(company) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operation failed";
      toast.error(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadEntry = async (name: string) => {
    return await frappe.getDoc<JournalEntry>("Journal Entry", name);
  };

  const handleEditFromHistory = (name: string) => {
    formRef.current?.loadEntryForEdit(name);
  };

  return (
    <div className="mx-auto max-w-6xl h-[calc(100svh-7rem)] overflow-hidden">
      <div className="grid h-full grid-rows-1 grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 overflow-hidden">
        {/* Form */}
        <div className="min-h-0 overflow-y-auto">
          <WriteCheckForm
            ref={formRef}
            onSubmit={handleSubmit}
            onLoadEntry={handleLoadEntry}
            isSubmitting={isSubmitting}
            onOpenNewAccount={() => setCreateAccountOpen(true)}
          />
        </div>

        {/* History — desktop */}
        <div className="hidden lg:flex h-full min-h-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
          <HistoryPanel onEdit={handleEditFromHistory} />
        </div>
      </div>

      {/* Mobile: history below */}
      <div className="mt-6 lg:hidden rounded-xl border bg-card p-4 shadow-sm">
        <HistoryPanel onEdit={handleEditFromHistory} />
      </div>

      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        company={company}
      />
    </div>
  );
}
