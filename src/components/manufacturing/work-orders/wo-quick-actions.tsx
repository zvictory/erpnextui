"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Play, ArrowRightLeft, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QuickManufactureDialog } from "@/components/manufacturing/work-orders/quick-manufacture-dialog";
import { useMakeStockEntry, useStopWorkOrder } from "@/hooks/use-manufacturing";
import type { WorkOrder } from "@/types/manufacturing";

interface WoQuickActionsProps {
  workOrder: WorkOrder;
  onTabelOpen?: () => void;
}

export function WoQuickActions({ workOrder, onTabelOpen }: WoQuickActionsProps) {
  const t = useTranslations("mfg.workOrders");
  const tCosting = useTranslations("costing");
  const [mfgOpen, setMfgOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  const makeStockEntry = useMakeStockEntry();
  const stopWorkOrder = useStopWorkOrder();

  const canAct = workOrder.status === "In Process" || workOrder.status === "Not Started";
  const canFinish = workOrder.produced_qty >= workOrder.qty && canAct;

  function handleMaterialTransfer() {
    makeStockEntry.mutate(
      {
        workOrder: workOrder.name,
        purpose: "Material Transfer for Manufacture",
      },
      {
        onSuccess: () => toast.success(t("materialTransfer") + " - OK"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleFinish() {
    stopWorkOrder.mutate(workOrder.name, {
      onSuccess: () => {
        toast.success(t("finishOrder") + " - OK");
        setFinishOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (!canAct) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("submitFirst")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Quick Manufacture */}
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-6"
          onClick={() => setMfgOpen(true)}
          disabled={!canAct}
        >
          <Play className="h-6 w-6" />
          <span>{t("quickManufacture")}</span>
        </Button>

        {/* Material Transfer */}
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-6"
          onClick={handleMaterialTransfer}
          disabled={!canAct || makeStockEntry.isPending}
        >
          <ArrowRightLeft className="h-6 w-6" />
          <span>{t("materialTransfer")}</span>
        </Button>

        {/* Labor Tabel */}
        {onTabelOpen && (
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-6"
            onClick={onTabelOpen}
            disabled={!canAct}
          >
            <Clock className="h-6 w-6" />
            <span>{tCosting("tabel")}</span>
          </Button>
        )}

        {/* Finish Order */}
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-6"
          onClick={() => setFinishOpen(true)}
          disabled={!canFinish}
        >
          <CheckCircle className="h-6 w-6" />
          <span>{t("finishOrder")}</span>
        </Button>
      </div>

      <QuickManufactureDialog workOrder={workOrder} open={mfgOpen} onOpenChange={setMfgOpen} />

      <ConfirmDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title={t("finishOrder")}
        description={`Stop "${workOrder.name}" and mark as complete?`}
        confirmLabel={t("finishOrder")}
        variant="default"
        onConfirm={handleFinish}
        loading={stopWorkOrder.isPending}
      />
    </div>
  );
}
