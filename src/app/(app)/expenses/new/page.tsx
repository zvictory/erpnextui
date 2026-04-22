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
import { useBankAccountsWithCurrency } from "@/hooks/use-accounts";
import { queryKeys } from "@/hooks/query-keys";
import { ensureMultiCurrencyEnabled } from "@/lib/multi-currency";
import type { AccountWithCurrency } from "@/types/account";
import type { JournalEntry, JournalEntryAccount } from "@/types/journal-entry";

/**
 * Round to 2 decimal places (accounting precision)
 */
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildAccounts(data: WriteCheckFormData): JournalEntryAccount[] {
  const total = data.expenseLines.reduce((sum, l) => sum + l.amount, 0);

  if (!data.isMultiCurrency) {
    // Same-currency path — no exchange rates needed
    const accounts: JournalEntryAccount[] = data.expenseLines.map((l) => ({
      doctype: "Journal Entry Account",
      account: l.account,
      debit_in_account_currency: roundTo2(l.amount),
      user_remark: l.memo,
    }));
    accounts.push({
      doctype: "Journal Entry Account",
      account: data.paymentFrom,
      credit_in_account_currency: roundTo2(total),
    });
    return accounts;
  }

  // Multi-currency — Figure 4 (Golden Rule allocation):
  //   total (sum of sacred line amounts) and ct (sacred user-confirmed base total) are both inputs.
  //   R is DERIVED from the two sacred values so debit base = credit base to the cent.
  //   No Math.round on derived sums — the derived quotient carries full precision.
  const ct = data.convertedTotal;
  const R = total > 0 ? ct / total : data.exchangeRate;

  const accounts: JournalEntryAccount[] = data.expenseLines.map((l) => ({
    doctype: "Journal Entry Account",
    account: l.account,
    debit_in_account_currency: l.amount,
    exchange_rate: R,
    user_remark: l.memo,
  }));
  accounts.push({
    doctype: "Journal Entry Account",
    account: data.paymentFrom,
    credit_in_account_currency: total,
    exchange_rate: R,
  });
  return accounts;
}

function buildRemark(payee: string, lines: { memo: string }[]): string {
  const memos = lines.map((l) => l.memo).join("; ");
  if (payee) return `Paid to ${payee} | ${memos}`;
  return memos;
}

function collectCurrencies(
  data: WriteCheckFormData,
  bankAccounts: AccountWithCurrency[],
): string[] {
  const paymentCurrency =
    bankAccounts.find((a) => a.name === data.paymentFrom)?.account_currency ?? "";
  return [paymentCurrency];
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

  const handleSubmit = async (data: WriteCheckFormData) => {
    const accounts = buildAccounts(data);
    const remark = `[Expense] ${buildRemark(data.payee, data.expenseLines)}`;

    setIsSubmitting(true);
    try {
      const currencies = collectCurrencies(data, bankAccounts ?? []);
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
        listKeySuffix: "[Expense]",
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
          <HistoryPanel onEdit={handleEditFromHistory} remarkFilter="[Expense]" />
        </div>
      </div>

      {/* Mobile: history below */}
      <div className="mt-6 lg:hidden rounded-xl border bg-card p-4 shadow-sm">
        <HistoryPanel onEdit={handleEditFromHistory} remarkFilter="[Expense]" />
      </div>

      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        company={company}
      />
    </div>
  );
}
