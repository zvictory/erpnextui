"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import {
  useJournalEntry,
  useCancelJournalEntry,
  useAmendJournalEntry,
  useSaveDraftJournalEntry,
  useSubmitJournalEntry,
  useDeleteJournalEntry,
} from "@/hooks/use-journal-entries";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { formatInvoiceCurrency, formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import type { JournalEntryAccount } from "@/types/journal-entry";

interface JEDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jeName: string;
}

export function JEDetailDialog({ open, onOpenChange, jeName }: JEDetailDialogProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const { data: je, isLoading } = useJournalEntry(open ? jeName : "");
  const { data: currencyMap } = useCurrencyMap();

  const cancelJE = useCancelJournalEntry();
  const amendJE = useAmendJournalEntry();
  const saveDraft = useSaveDraftJournalEntry();
  const submitJE = useSubmitJournalEntry();
  const deleteJE = useDeleteJournalEntry();

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [amendAfterCancel, setAmendAfterCancel] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editAccounts, setEditAccounts] = useState<JournalEntryAccount[]>([]);

  const isDraft = je?.docstatus === 0;
  const isSubmitted = je?.docstatus === 1;
  const isCancelled = je?.docstatus === 2;

  // Initialize edit state when JE loads or edit mode activates
  useEffect(() => {
    if (je && editing) {
      setEditDate(je.posting_date);
      setEditRemark(je.user_remark ?? "");
      setEditAccounts(je.accounts.map((a) => ({ ...a })));
    }
  }, [je, editing]);

  // Auto-enter edit mode for drafts
  useEffect(() => {
    if (je && isDraft && open) {
      setEditing(true);
    }
  }, [je, isDraft, open]);

  const resetState = () => {
    setConfirmingCancel(false);
    setAmendAfterCancel(false);
    setConfirmingDelete(false);
    setEditing(false);
  };

  // --- Submitted JE actions ---

  const handleCancel = (amend: boolean) => {
    setAmendAfterCancel(amend);
    setConfirmingCancel(true);
  };

  const executeCancelOrAmend = () => {
    if (!je) return;

    if (amendAfterCancel) {
      amendJE.mutate(
        {
          originalName: jeName,
          postingDate: je.posting_date,
          company: je.company,
          userRemark: je.user_remark ?? "",
          accounts: je.accounts,
          multiCurrency: (je as unknown as Record<string, unknown>).multi_currency === 1,
          voucherType: je.voucher_type,
        },
        {
          onSuccess: (result) => {
            toast.success(t("jeAmended", { name: result.newName }));
            resetState();
            onOpenChange(false);
          },
          onError: (err) => {
            toast.error(err.message);
            setConfirmingCancel(false);
          },
        },
      );
    } else {
      cancelJE.mutate(
        { name: jeName },
        {
          onSuccess: () => {
            toast.success(t("jeCancelled"));
            resetState();
            onOpenChange(false);
          },
          onError: (err) => {
            toast.error(err.message);
            setConfirmingCancel(false);
          },
        },
      );
    }
  };

  // --- Draft actions ---

  const handleSaveDraft = () => {
    if (!je) return;
    saveDraft.mutate(
      {
        name: jeName,
        postingDate: editDate,
        userRemark: editRemark,
        accounts: editAccounts,
        multiCurrency: (je as unknown as Record<string, unknown>).multi_currency === 1,
      },
      {
        onSuccess: () => {
          toast.success(t("draftSaved"));
          resetState();
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleSaveAndSubmit = () => {
    if (!je) return;
    saveDraft.mutate(
      {
        name: jeName,
        postingDate: editDate,
        userRemark: editRemark,
        accounts: editAccounts,
        multiCurrency: (je as unknown as Record<string, unknown>).multi_currency === 1,
      },
      {
        onSuccess: () => {
          submitJE.mutate(
            { name: jeName },
            {
              onSuccess: () => {
                toast.success(t("submitSuccess"));
                resetState();
                onOpenChange(false);
              },
              onError: (err) => toast.error(err.message),
            },
          );
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const executeDelete = () => {
    deleteJE.mutate(
      { name: jeName },
      {
        onSuccess: () => {
          toast.success(t("deleteSuccess"));
          resetState();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message);
          setConfirmingDelete(false);
        },
      },
    );
  };

  const updateAccountAmount = (
    index: number,
    field: "debit_in_account_currency" | "credit_in_account_currency",
    value: number,
  ) => {
    setEditAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, [field]: value } : acc)),
    );
  };

  const isPending =
    cancelJE.isPending ||
    amendJE.isPending ||
    saveDraft.isPending ||
    submitJE.isPending ||
    deleteJE.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("viewJournalEntry")}
            {je && <DocstatusBadge docstatus={je.docstatus} />}
          </DialogTitle>
          <DialogDescription>{jeName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : je ? (
          <div className="space-y-4">
            {/* Header fields */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{tCommon("date")}: </span>
                {editing ? (
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="h-7 w-40 inline-block text-sm"
                  />
                ) : (
                  <span>{formatDate(je.posting_date)}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">{tCommon("voucherType")}: </span>
                <span>{je.voucher_type}</span>
              </div>
            </div>

            {editing ? (
              <Input
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                placeholder={tCommon("remarks")}
                className="text-sm"
              />
            ) : (
              je.user_remark && <p className="text-sm text-muted-foreground">{je.user_remark}</p>
            )}

            {/* Accounts table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("jeAccounts")}</TableHead>
                  <TableHead>{t("jeParty")}</TableHead>
                  <TableHead className="text-right">{tCommon("debit")}</TableHead>
                  <TableHead className="text-right">{tCommon("credit")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(editing ? editAccounts : je.accounts).map((acc, i) => {
                  const accCurrency = acc.account_currency ?? "USD";
                  const info = currencyMap?.get(accCurrency);
                  const debit = acc.debit_in_account_currency ?? 0;
                  const credit = acc.credit_in_account_currency ?? 0;

                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{acc.account}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {acc.party || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">
                        {editing ? (
                          debit > 0 ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={debit}
                              onChange={(e) =>
                                updateAccountAmount(
                                  i,
                                  "debit_in_account_currency",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-7 w-28 text-right text-sm ml-auto"
                            />
                          ) : (
                            ""
                          )
                        ) : debit > 0 ? (
                          formatInvoiceCurrency(debit, accCurrency, info)
                        ) : (
                          ""
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">
                        {editing ? (
                          credit > 0 ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={credit}
                              onChange={(e) =>
                                updateAccountAmount(
                                  i,
                                  "credit_in_account_currency",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-7 w-28 text-right text-sm ml-auto"
                            />
                          ) : (
                            ""
                          )
                        ) : credit > 0 ? (
                          formatInvoiceCurrency(credit, accCurrency, info)
                        ) : (
                          ""
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Action buttons */}
            {confirmingCancel ? (
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <p className="text-sm text-muted-foreground flex-1">
                  {amendAfterCancel ? t("confirmAmendJE") : t("confirmCancelJE")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={executeCancelOrAmend}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {tCommon("confirm")}
                </Button>
              </div>
            ) : confirmingDelete ? (
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <p className="text-sm text-muted-foreground flex-1">{t("confirmDeleteDraft")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={executeDelete}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {tCommon("confirm")}
                </Button>
              </div>
            ) : isDraft ? (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={isPending}
                >
                  {tCommon("delete")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isPending}>
                  {tCommon("save")}
                </Button>
                <Button size="sm" onClick={handleSaveAndSubmit} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {t("saveAndSubmit")}
                </Button>
              </div>
            ) : isSubmitted ? (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="destructive" size="sm" onClick={() => handleCancel(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCancel(true)}>
                  {tCommon("amend")}
                </Button>
              </div>
            ) : isCancelled ? (
              <p className="text-xs text-muted-foreground pt-2 border-t">{t("jeCancelledNote")}</p>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
