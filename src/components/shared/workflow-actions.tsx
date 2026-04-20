"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWorkflowTransition } from "@/hooks/use-workflow";
import { toast } from "sonner";
import { Check, Send, Package, ClipboardCheck, FileText, RotateCcw } from "lucide-react";

interface WorkflowActionsProps {
  doctype: string;
  docname: string;
  currentState: string;
  onTransition?: () => void;
  onSpecialAction?: (action: string) => Promise<void>;
}

/** Map: state -> available actions with metadata */
const STATE_ACTIONS: Record<
  string,
  {
    action: string;
    tKey: string;
    icon: React.ComponentType<{ className?: string }>;
    variant?: "default" | "destructive" | "outline";
  }[]
> = {
  Submitted: [{ action: "Send to Pick", tKey: "sendToPick", icon: Send }],
  "Pending Pick": [{ action: "Start Picking", tKey: "startPicking", icon: Package }],
  Picking: [{ action: "Complete Pick", tKey: "completePick", icon: ClipboardCheck }],
  "Stock Check": [
    { action: "Confirm Stock", tKey: "confirmStock", icon: Check },
    { action: "Re-pick", tKey: "rePick", icon: RotateCcw, variant: "destructive" },
  ],
  Packed: [
    { action: "Send to Invoice", tKey: "sendToInvoice", icon: FileText },
    { action: "Re-pick Error", tKey: "rePickError", icon: RotateCcw, variant: "destructive" },
  ],
  "To Invoice": [{ action: "Create Invoice", tKey: "createInvoice", icon: FileText }],
};

export function WorkflowActions({
  doctype,
  docname,
  currentState,
  onTransition,
  onSpecialAction,
}: WorkflowActionsProps) {
  const t = useTranslations("workflow");
  const transition = useWorkflowTransition();
  const [rePickDialogOpen, setRePickDialogOpen] = useState(false);
  const [rePickReason, setRePickReason] = useState("");
  const [rePickAction, setRePickAction] = useState("");

  const actions = STATE_ACTIONS[currentState] ?? [];
  if (actions.length === 0) return null;

  async function handleAction(action: string) {
    // Re-pick actions need a reason dialog
    if (action === "Re-pick" || action === "Re-pick Error") {
      setRePickAction(action);
      setRePickDialogOpen(true);
      return;
    }

    // "Create Invoice" delegates to special handler if provided
    if (action === "Create Invoice" && onSpecialAction) {
      try {
        await onSpecialAction(action);
        onTransition?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
      return;
    }

    try {
      await transition.mutateAsync({ doctype, docname, action });
      toast.success(`${action} successful`);
      onTransition?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transition failed");
    }
  }

  async function handleRePickConfirm() {
    try {
      await transition.mutateAsync({ doctype, docname, action: rePickAction });
      toast.success(`${rePickAction} successful`);
      setRePickDialogOpen(false);
      setRePickReason("");
      setRePickAction("");
      onTransition?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${rePickAction} failed`);
    }
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {actions.map(({ action, tKey, icon: Icon, variant }) => (
          <Button
            key={action}
            variant={variant ?? "default"}
            onClick={() => handleAction(action)}
            disabled={transition.isPending}
          >
            <Icon className="h-4 w-4 mr-1.5" />
            {t(tKey)}
          </Button>
        ))}
      </div>

      <Dialog open={rePickDialogOpen} onOpenChange={setRePickDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(rePickAction === "Re-pick" ? "rePick" : "rePickError")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("rePickReason")}
            value={rePickReason}
            onChange={(e) => setRePickReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRePickDialogOpen(false)}>
              {t("cancel") ?? "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRePickConfirm}
              disabled={transition.isPending || !rePickReason.trim()}
            >
              {t(rePickAction === "Re-pick" ? "rePick" : "rePickError")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
