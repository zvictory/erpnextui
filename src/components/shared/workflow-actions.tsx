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
import {
  Check,
  X,
  Send,
  Package,
  PackageCheck,
  Truck,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface WorkflowActionsProps {
  doctype: string;
  docname: string;
  currentState: string;
  onTransition?: () => void;
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
  Draft: [
    { action: "Submit for Approval", tKey: "submitForApproval", icon: Send },
  ],
  "Pending Approval": [
    { action: "Approve", tKey: "approve", icon: Check },
    { action: "Reject", tKey: "reject", icon: X, variant: "destructive" },
  ],
  Rejected: [
    { action: "Resubmit", tKey: "resubmit", icon: RotateCcw },
  ],
  Approved: [
    { action: "Send to Warehouse", tKey: "sendToWarehouse", icon: Send },
  ],
  "Ready for Pickup": [
    { action: "Mark as Picked", tKey: "markAsPicked", icon: Package },
  ],
  Picked: [
    { action: "Mark as Packed", tKey: "markAsPacked", icon: PackageCheck },
  ],
  Packed: [
    { action: "Mark as Delivered", tKey: "markAsDelivered", icon: Truck },
  ],
  Delivered: [
    { action: "Complete", tKey: "complete", icon: CheckCircle2 },
  ],
};

export function WorkflowActions({
  doctype,
  docname,
  currentState,
  onTransition,
}: WorkflowActionsProps) {
  const t = useTranslations("workflow");
  const transition = useWorkflowTransition();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const actions = STATE_ACTIONS[currentState] ?? [];
  if (actions.length === 0) return null;

  async function handleAction(action: string) {
    // Reject needs a reason dialog
    if (action === "Reject") {
      setRejectDialogOpen(true);
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

  async function handleRejectConfirm() {
    try {
      await transition.mutateAsync({ doctype, docname, action: "Reject" });
      toast.success("Rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      onTransition?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
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

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reject")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("rejectReason")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              {t("cancel") ?? "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={transition.isPending}
            >
              {t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
