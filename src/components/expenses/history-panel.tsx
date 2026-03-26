"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, ReceiptText } from "lucide-react";
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
  onEdit?: (name: string) => void;
  voucherType?: string;
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

export function HistoryPanel({ onEdit, voucherType }: HistoryPanelProps) {
  const t = useTranslations("expenses");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const {
    data: entries,
    isLoading,
    refetch,
    isRefetching,
  } = useJournalEntryList(company, voucherType);

  const submitMutation = useSubmitJournalEntry();
  const cancelMutation = useCancelJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const anyMutationPending =
    submitMutation.isPending || cancelMutation.isPending || deleteMutation.isPending;

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("history")}
          </h3>
          {entries && entries.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {entries.length}
            </span>
          )}
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isRefetching}
          aria-label="Refresh entries"
          className="h-6 w-6"
        >
          <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border bg-card px-3 py-2.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-20 rounded bg-muted" />
                  <div className="h-4 w-12 rounded-full bg-muted" />
                </div>
                <div className="h-3 w-28 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ReceiptText className="size-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{t("noHistory")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <HistoryRow
                key={entry.name}
                entry={entry}
                currencySymbol={currencySymbol}
                symbolOnRight={symbolOnRight}
                onSubmit={(name) => openConfirm("submit", name)}
                onEdit={onEdit ?? undefined}
                onAmend={onEdit ?? undefined}
                onCancel={(name) => openConfirm("cancel", name)}
                onDelete={(name) => openConfirm("delete", name)}
                disabled={anyMutationPending}
              />
            ))}
          </div>
        )}
      </div>

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
