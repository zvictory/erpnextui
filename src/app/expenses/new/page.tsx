"use client";

import { useRef, useState } from "react";
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
import type { JournalEntry, JournalEntryAccount } from "@/types/journal-entry";

function buildAccounts(
  expenseLines: { account: string; amount: number }[],
  paymentFrom: string,
): JournalEntryAccount[] {
  const total = expenseLines.reduce((sum, l) => sum + l.amount, 0);
  const accounts: JournalEntryAccount[] = expenseLines.map((l) => ({
    doctype: "Journal Entry Account",
    account: l.account,
    debit_in_account_currency: l.amount,
  }));
  accounts.push({
    doctype: "Journal Entry Account",
    account: paymentFrom,
    credit_in_account_currency: total,
  });
  return accounts;
}

function buildRemark(payee: string, memo: string): string {
  if (memo) return memo;
  if (payee) return `Paid to ${payee}`;
  return "";
}

export default function WriteCheckPage() {
  const { company } = useCompanyStore();
  const formRef = useRef<WriteCheckFormHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  const createAndSubmit = useCreateAndSubmitJournalEntry();
  const amend = useAmendJournalEntry();
  const updateDraft = useUpdateDraftAndSubmit();

  const handleSubmit = async (data: WriteCheckFormData) => {
    const accounts = buildAccounts(data.expenseLines, data.paymentFrom);
    const remark = buildRemark(data.payee, data.memo);

    setIsSubmitting(true);
    try {
      // Branch: Edit draft (docstatus 0)
      if (data.editingName && data.editingDocstatus === 0) {
        const result = await updateDraft.mutateAsync({
          name: data.editingName,
          postingDate: data.postingDate,
          userRemark: remark,
          accounts,
        });
        if (result.submitted) {
          toast.success(`Updated & submitted ${result.name}`);
        } else {
          toast.warning(
            `Saved ${result.name} but submit failed: ${result.error}`,
          );
        }
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
        });
        toast.success(
          `Cancelled ${result.originalName}. New draft: ${result.newName}`,
        );
        return;
      }

      // Branch: Create new
      const result = await createAndSubmit.mutateAsync({
        postingDate: data.postingDate,
        company,
        userRemark: remark,
        accounts,
      });
      if (result.submitted) {
        toast.success(`Submitted ${result.name}`);
      } else {
        toast.warning(
          `Created ${result.name} as draft (submit failed: ${result.error})`,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Operation failed";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <WriteCheckForm
        ref={formRef}
        onSubmit={handleSubmit}
        onLoadEntry={handleLoadEntry}
        isSubmitting={isSubmitting}
        onOpenNewAccount={() => setCreateAccountOpen(true)}
      />

      <HistoryPanel onEdit={handleEditFromHistory} />

      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        company={company}
      />
    </div>
  );
}
