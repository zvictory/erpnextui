"use client";

import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { HistoryRow } from "@/components/expenses/history-row";
import { useCompanyStore } from "@/stores/company-store";
import {
  useJournalEntryList,
  useSubmitJournalEntry,
  useCancelJournalEntry,
  useDeleteJournalEntry,
} from "@/hooks/use-journal-entries";

interface HistoryPanelProps {
  onEdit: (name: string) => void;
}

type ConfirmAction = "submit" | "cancel" | "delete";

interface ConfirmState {
  open: boolean;
  action: ConfirmAction;
  name: string;
}

const CONFIRM_CONFIG: Record<
  ConfirmAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
  }
> = {
  submit: {
    title: "Submit Journal Entry",
    description:
      "Are you sure you want to submit this journal entry? Submitted entries cannot be directly edited.",
    confirmLabel: "Submit",
    variant: "default",
  },
  cancel: {
    title: "Cancel Journal Entry",
    description:
      "Are you sure you want to cancel this journal entry? This action cannot be undone.",
    confirmLabel: "Cancel Entry",
    variant: "destructive",
  },
  delete: {
    title: "Delete Journal Entry",
    description:
      "Are you sure you want to permanently delete this journal entry? This action cannot be undone.",
    confirmLabel: "Delete",
    variant: "destructive",
  },
};

export function HistoryPanel({ onEdit }: HistoryPanelProps) {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const {
    data: entries,
    isLoading,
    refetch,
    isRefetching,
  } = useJournalEntryList(company);

  const submitMutation = useSubmitJournalEntry();
  const cancelMutation = useCancelJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const anyMutationPending =
    submitMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    action: "submit",
    name: "",
  });

  const openConfirm = useCallback((action: ConfirmAction, name: string) => {
    setConfirm({ open: true, action, name });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirm((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    const { action, name } = confirm;

    if (action === "submit") {
      submitMutation.mutate(
        { name },
        {
          onSuccess: () => {
            toast.success(`Journal entry ${name} submitted.`);
            closeConfirm();
          },
          onError: (err) => {
            toast.error(`Failed to submit: ${err.message}`);
          },
        },
      );
    } else if (action === "cancel") {
      cancelMutation.mutate(
        { name },
        {
          onSuccess: () => {
            toast.success(`Journal entry ${name} cancelled.`);
            closeConfirm();
          },
          onError: (err) => {
            toast.error(`Failed to cancel: ${err.message}`);
          },
        },
      );
    } else if (action === "delete") {
      deleteMutation.mutate(
        { name },
        {
          onSuccess: () => {
            toast.success(`Journal entry ${name} deleted.`);
            closeConfirm();
          },
          onError: (err) => {
            toast.error(`Failed to delete: ${err.message}`);
          },
        },
      );
    }
  }, [confirm, submitMutation, cancelMutation, deleteMutation, closeConfirm]);

  const confirmConfig = CONFIRM_CONFIG[confirm.action];
  const confirmLoading =
    (confirm.action === "submit" && submitMutation.isPending) ||
    (confirm.action === "cancel" && cancelMutation.isPending) ||
    (confirm.action === "delete" && deleteMutation.isPending);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent Journal Entries</h3>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={isRefetching ? "animate-spin" : undefined}
          />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Loading...
        </p>
      ) : !entries || entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No journal entries found.
        </p>
      ) : (
        <div className="space-y-0.5">
          {entries.map((entry) => (
            <HistoryRow
              key={entry.name}
              entry={entry}
              currencySymbol={currencySymbol}
              symbolOnRight={symbolOnRight}
              onSubmit={(name) => openConfirm("submit", name)}
              onEdit={onEdit}
              onAmend={onEdit}
              onCancel={(name) => openConfirm("cancel", name)}
              onDelete={(name) => openConfirm("delete", name)}
              disabled={anyMutationPending}
            />
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        onConfirm={handleConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}
