"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Trash2, Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import { useAuthStore } from "@/stores/auth-store";
import { formatDate, formatCurrency } from "@/lib/formatters";
import {
  useCancelSalaryAccrual,
  useDeleteSalaryAccrual,
  useSubmitSalaryAccrual,
} from "@/hooks/use-salary";
import type { SalaryAccrualJE } from "@/hooks/use-salary";

type ConfirmAction = "submit" | "cancel" | "delete";

interface ConfirmState {
  open: boolean;
  action: ConfirmAction;
  name: string;
}

interface SalaryAccrualHistoryProps {
  entries: SalaryAccrualJE[];
  currencySymbol: string;
  symbolOnRight: boolean;
  onAmend?: (je: SalaryAccrualJE) => void;
}

export function SalaryAccrualHistory({
  entries,
  currencySymbol,
  symbolOnRight,
  onAmend,
}: SalaryAccrualHistoryProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const siteUrl = useAuthStore((s) => s.siteUrl);

  const cancelMutation = useCancelSalaryAccrual();
  const deleteMutation = useDeleteSalaryAccrual();
  const submitMutation = useSubmitSalaryAccrual();

  const anyPending =
    cancelMutation.isPending || deleteMutation.isPending || submitMutation.isPending;

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
      submitMutation.mutate(name, {
        onSuccess: () => {
          toast.success(t("accrualSubmitted"));
          closeConfirm();
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (action === "cancel") {
      cancelMutation.mutate(name, {
        onSuccess: () => {
          toast.success(t("accrualCancelled"));
          closeConfirm();
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (action === "delete") {
      deleteMutation.mutate(name, {
        onSuccess: () => {
          toast.success(t("accrualDeleted"));
          closeConfirm();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }, [confirm, submitMutation, cancelMutation, deleteMutation, closeConfirm, t]);

  const confirmConfig: Record<
    ConfirmAction,
    { title: string; description: string; confirmLabel: string; variant: "default" | "destructive" }
  > = {
    submit: {
      title: t("confirmSubmitAccrual"),
      description: t("confirmSubmitAccrual"),
      confirmLabel: tCommon("submit"),
      variant: "default",
    },
    cancel: {
      title: t("confirmCancelAccrual"),
      description: t("confirmCancelAccrual"),
      confirmLabel: tCommon("cancel"),
      variant: "destructive",
    },
    delete: {
      title: t("confirmDeleteAccrual"),
      description: t("confirmDeleteAccrual"),
      confirmLabel: tCommon("delete"),
      variant: "destructive",
    },
  };

  const currentConfig = confirmConfig[confirm.action];
  const confirmLoading =
    (confirm.action === "submit" && submitMutation.isPending) ||
    (confirm.action === "cancel" && cancelMutation.isPending) ||
    (confirm.action === "delete" && deleteMutation.isPending);

  if (entries.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("accrualHistory")}
          <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
            {entries.length}
          </span>
        </h3>
        {entries.map((je) => (
          <div
            key={je.name}
            className={`group relative rounded-lg border-l-2 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 ${
              je.docstatus === 0
                ? "border-l-amber-400"
                : je.docstatus === 1
                  ? "border-l-blue-500"
                  : "border-l-muted-foreground/30"
            }`}
          >
            {/* Row 1: Amount */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">
                {formatCurrency(je.total_debit, currencySymbol, symbolOnRight)}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {je.employees.length} {t("employee").toLowerCase()}
              </Badge>
            </div>

            {/* Row 2: Date · JE name · Status */}
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="shrink-0">{formatDate(je.posting_date)}</span>
              <span className="opacity-40 shrink-0">·</span>
              <a
                href={`${siteUrl}/app/journal-entry/${je.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-primary/70 hover:text-primary hover:underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {je.name}
              </a>
              <span className="ml-auto shrink-0">
                <DocstatusBadge docstatus={je.docstatus} />
              </span>
            </div>

            {/* Actions */}
            <div className="mt-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              {je.docstatus === 0 && (
                <>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => openConfirm("submit", je.name)}
                    disabled={anyPending}
                    aria-label="Submit"
                    className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-blue-600"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => openConfirm("delete", je.name)}
                    disabled={anyPending}
                    aria-label="Delete"
                    className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              {je.docstatus === 1 && (
                <>
                  {onAmend && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => {
                        // Cancel first, then pre-fill
                        cancelMutation.mutate(je.name, {
                          onSuccess: () => {
                            toast.success(t("accrualCancelled"));
                            onAmend(je);
                          },
                          onError: (err) => toast.error(err.message),
                        });
                      }}
                      disabled={anyPending}
                      aria-label="Amend"
                      className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => openConfirm("cancel", je.name)}
                    disabled={anyPending}
                    aria-label="Cancel"
                    className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </>
              )}
              {je.docstatus === 2 && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => openConfirm("delete", je.name)}
                  disabled={anyPending}
                  aria-label="Delete"
                  className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
        title={currentConfig.title}
        description={currentConfig.description}
        confirmLabel={currentConfig.confirmLabel}
        variant={currentConfig.variant}
        onConfirm={handleConfirm}
        loading={confirmLoading}
      />
    </>
  );
}
