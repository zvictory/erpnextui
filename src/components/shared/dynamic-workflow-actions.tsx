"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Check,
  XCircle,
  Send,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useWorkflowTransitions,
  useApplyWorkflow,
} from "@/hooks/use-document-workflow";

interface DynamicWorkflowActionsProps {
  doctype: string;
  docname: string;
  currentState: string;
  onTransition?: () => void;
  invalidateKeys?: string[][];
}

const DESTRUCTIVE_ACTIONS = ["cancel", "reject"];

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("approve") || lower.includes("confirm")) return Check;
  if (lower.includes("cancel") || lower.includes("reject")) return XCircle;
  if (lower.includes("send")) return Send;
  return Play;
}

function isDestructive(action: string) {
  return DESTRUCTIVE_ACTIONS.some((d) => action.toLowerCase().includes(d));
}

export function DynamicWorkflowActions({
  doctype,
  docname,
  currentState,
  onTransition,
  invalidateKeys,
}: DynamicWorkflowActionsProps) {
  const t = useTranslations("workflow");
  const { transitions, isLoading } = useWorkflowTransitions(
    doctype,
    docname,
    currentState,
  );
  const applyWorkflow = useApplyWorkflow(invalidateKeys);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  if (isLoading || transitions.length === 0) return null;

  async function handleApply(action: string) {
    try {
      await applyWorkflow.mutateAsync({ doctype, docname, action });
      toast.success(t("actionSuccess", { action }));
      onTransition?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("actionFailed", { action });
      toast.error(message);
    }
  }

  function handleClick(action: string) {
    if (isDestructive(action)) {
      setConfirmAction(action);
    } else {
      handleApply(action);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {transitions.map(({ action }) => {
          const Icon = getActionIcon(action);
          const destructive = isDestructive(action);
          return (
            <Button
              key={action}
              variant={destructive ? "destructive" : "default"}
              size="sm"
              onClick={() => handleClick(action)}
              disabled={applyWorkflow.isPending}
            >
              {applyWorkflow.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Icon className="mr-1 size-4" />
              )}
              {action}
            </Button>
          );
        })}
      </div>

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("confirmTitle", { action: confirmAction ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDescription", { action: confirmAction ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyWorkflow.isPending}>
              {t("dismiss")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={applyWorkflow.isPending}
              onClick={() => {
                if (confirmAction) handleApply(confirmAction);
                setConfirmAction(null);
              }}
            >
              {applyWorkflow.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : null}
              {confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
