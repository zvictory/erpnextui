"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { DepreciationCard } from "@/components/assets/depreciation-card";
import { OEECard } from "@/components/assets/oee-card";
import { AssetForm } from "@/components/assets/asset-form";
import { MaintenanceLogTable } from "@/components/maintenance/maintenance-log-table";
import { PreventiveScheduleList } from "@/components/maintenance/preventive-schedule-list";
import { getAsset, updateAsset, deleteAsset } from "@/actions/assets";
import { formatDate } from "@/lib/formatters";
import type { Asset, AssetFormValues } from "@/types/asset";

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("assets");
  const qc = useQueryClient();
  const id = Number(params.id);
  const [editing, setEditing] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => getAsset(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: AssetFormValues) => updateAsset(id, data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("assetUpdated"));
        qc.invalidateQueries({ queryKey: ["asset", id] });
        qc.invalidateQueries({ queryKey: ["assets"] });
        setEditing(false);
      } else {
        toast.error(res.error);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("assetDeleted"));
        qc.invalidateQueries({ queryKey: ["assets"] });
        router.push("/assets");
      } else {
        toast.error(res.error);
      }
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("loading")}</p>;

  const asset = result?.success ? (result.data as Asset) : null;
  if (!asset) return <p className="text-sm text-destructive">{t("assetNotFound")}</p>;

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("editAsset")}</h1>
          <Button variant="outline" onClick={() => setEditing(false)}>
            {t("cancel")}
          </Button>
        </div>
        <AssetForm
          defaultValues={asset}
          onSubmit={(data) => updateMutation.mutate(data)}
          isSubmitting={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{asset.name}</h1>
          <AssetStatusBadge status={asset.status} />
          <span className="text-sm text-muted-foreground">{asset.assetCode}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t("edit")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t("delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("deleteConfirmDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="maintenance">{t("maintenanceHistory")}</TabsTrigger>
          <TabsTrigger value="schedule">{t("preventiveSchedule")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Info card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t("details")}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">{t("model")}</dt>
                  <dd>{asset.model ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("serialNumber")}</dt>
                  <dd>{asset.serialNumber ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("category")}</dt>
                  <dd>{asset.category ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("location")}</dt>
                  <dd>{asset.location ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("workstation")}</dt>
                  <dd>{asset.workstation ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("supplier")}</dt>
                  <dd>{asset.supplier ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("purchaseDate")}</dt>
                  <dd>{formatDate(asset.purchaseDate)}</dd>
                  {asset.warrantyUntil && (
                    <>
                      <dt className="text-muted-foreground">{t("warrantyUntil")}</dt>
                      <dd>{formatDate(asset.warrantyUntil)}</dd>
                    </>
                  )}
                  {asset.powerKw && (
                    <>
                      <dt className="text-muted-foreground">{t("powerKw")}</dt>
                      <dd>{asset.powerKw} kW</dd>
                    </>
                  )}
                  {asset.capacity && (
                    <>
                      <dt className="text-muted-foreground">{t("capacity")}</dt>
                      <dd>{asset.capacity}</dd>
                    </>
                  )}
                </dl>
                {asset.notes && (
                  <p className="mt-3 text-sm text-muted-foreground">{asset.notes}</p>
                )}
              </CardContent>
            </Card>

            {/* Depreciation + OEE */}
            <div className="space-y-4">
              <DepreciationCard asset={asset} />
              <OEECard assetId={asset.id} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="pt-4">
          <MaintenanceLogTable assetId={asset.id} />
        </TabsContent>

        <TabsContent value="schedule" className="pt-4">
          <PreventiveScheduleList assetId={asset.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
