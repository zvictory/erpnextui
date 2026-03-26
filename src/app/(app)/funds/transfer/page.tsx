"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TransferForm,
  type TransferFormHandle,
  type TransferFormData,
} from "@/components/funds/transfer-form";
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
import type { JournalEntry } from "@/types/journal-entry";

export default function TransferFundsPage() {
  const { company } = useCompanyStore();
  const formRef = useRef<TransferFormHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const createAndSubmit = useCreateAndSubmitJournalEntry();
  const amend = useAmendJournalEntry();
  const updateDraft = useUpdateDraftAndSubmit();
  const { data: bankAccounts } = useBankAccountsWithCurrency(company);

  const handleSubmit = async (data: TransferFormData) => {
    setIsSubmitting(true);
    try {
      const fromCurrency =
        bankAccounts?.find((a) => a.name === data.fromAccount)?.account_currency ?? "";
      const toCurrency =
        bankAccounts?.find((a) => a.name === data.toAccount)?.account_currency ?? "";
      const multiCurrency = await ensureMultiCurrencyEnabled(company, [fromCurrency, toCurrency]);

      const remark = data.memo
        ? data.memo
        : `Transfer from ${data.fromAccount} to ${data.toAccount}`;

      const bankEntryFields = {
        voucherType: "Bank Entry" as const,
        chequeNo: remark,
        chequeDate: data.postingDate,
      };

      // Branch: Edit draft (docstatus 0)
      if (data.editingName && data.editingDocstatus === 0) {
        const result = await updateDraft.mutateAsync({
          name: data.editingName,
          postingDate: data.postingDate,
          userRemark: remark,
          accounts: data.accounts,
          multiCurrency,
          ...bankEntryFields,
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
          accounts: data.accounts,
          multiCurrency,
          ...bankEntryFields,
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
        accounts: data.accounts,
        multiCurrency,
        ...bankEntryFields,
      });
      if (result.submitted) {
        toast.success(`Transfer posted: ${result.name}`);
      } else {
        toast.warning(`Created ${result.name} as draft (submit failed: ${result.error})`);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.bankWithCurrency(company) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed";
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
    <div className="mx-auto max-w-6xl h-[calc(100vh-7rem)] overflow-hidden">
      <div className="grid h-full grid-rows-1 grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 overflow-hidden">
        {/* Form */}
        <div className="min-h-0 overflow-y-auto">
          <TransferForm
            ref={formRef}
            onSubmit={handleSubmit}
            onLoadEntry={handleLoadEntry}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* History — desktop */}
        <div className="hidden lg:flex h-full min-h-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
          <HistoryPanel onEdit={handleEditFromHistory} voucherType="Bank Entry" />
        </div>
      </div>

      {/* History — mobile */}
      <div className="mt-6 lg:hidden rounded-xl border bg-card p-4 shadow-sm">
        <HistoryPanel onEdit={handleEditFromHistory} voucherType="Bank Entry" />
      </div>
    </div>
  );
}
