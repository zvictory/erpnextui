"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Cog, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetSelectDialog } from "@/components/manufacturing/asset-select-dialog";
import {
  useWorkOrderAsset,
  useSaveWorkOrderAsset,
  useDeleteWorkOrderAsset,
} from "@/hooks/use-work-order-assets";

interface WoMachineCardProps {
  workOrderName: string;
}

export function WoMachineCard({ workOrderName }: WoMachineCardProps) {
  const t = useTranslations("mfg.workOrders");
  const tCommon = useTranslations("common");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: woAsset, isLoading } = useWorkOrderAsset(workOrderName);
  const saveMutation = useSaveWorkOrderAsset();
  const deleteMutation = useDeleteWorkOrderAsset();

  const handleSelect = (assetId: number) => {
    saveMutation.mutate(
      { workOrder: workOrderName, assetId },
      {
        onSuccess: () => toast.success(t("machineSaved")),
        onError: () => toast.error(tCommon("error")),
      },
    );
  };

  const handleRemove = () => {
    deleteMutation.mutate(workOrderName, {
      onSuccess: () => toast.success(t("machineRemoved")),
      onError: () => toast.error(tCommon("error")),
    });
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Cog className="h-4 w-4" />
              {t("machine")}
            </CardTitle>
            {woAsset ? (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  {t("changeMachine")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={handleRemove}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                + {t("select")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {woAsset ? (
            <div>
              <p className="font-medium">
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {woAsset.assetCode}
                </span>
                {woAsset.assetName}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {[woAsset.location, woAsset.powerKw ? `${woAsset.powerKw} kW` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noMachineSelected")}</p>
          )}
        </CardContent>
      </Card>

      <AssetSelectDialog open={dialogOpen} onOpenChange={setDialogOpen} onSelect={handleSelect} />
    </>
  );
}
