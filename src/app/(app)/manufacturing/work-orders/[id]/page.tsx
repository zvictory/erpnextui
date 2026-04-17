"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { WoStatusBadge } from "@/components/manufacturing/work-orders/wo-status-badge";
import { WoHeader } from "@/components/manufacturing/work-orders/wo-header";
import { WoMaterialsTab } from "@/components/manufacturing/work-orders/wo-materials-tab";
import { WoOperationsTab } from "@/components/manufacturing/work-orders/wo-operations-tab";
import { WoQuickActions } from "@/components/manufacturing/work-orders/wo-quick-actions";
import { WoTabelDialog } from "@/components/manufacturing/work-orders/wo-tabel-dialog";
import { WoMachineCard } from "@/components/manufacturing/work-orders/wo-machine-card";
import { useWorkOrder } from "@/hooks/use-manufacturing";

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const decodedId = decodeURIComponent(id);
  const t = useTranslations("mfg.workOrders");
  const { data: workOrder, isLoading } = useWorkOrder(decodedId);
  const [tabelOpen, setTabelOpen] = useState(false);

  if (isLoading) {
    return (
      <FormPageLayout title="..." backHref="/manufacturing/work-orders">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-full" />
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!workOrder) {
    return (
      <FormPageLayout title={t("title")} backHref="/manufacturing/work-orders">
        <p className="text-muted-foreground">Work order not found.</p>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title={workOrder.name} backHref="/manufacturing/work-orders">
      <div className="space-y-6">
        {/* Name + status */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-medium">{workOrder.item_name}</h2>
            <p className="text-sm text-muted-foreground">{workOrder.production_item}</p>
          </div>
          <WoStatusBadge status={workOrder.status} />
        </div>

        {/* Header with progress + metric cards */}
        <WoHeader workOrder={workOrder} />

        {/* Machine (Asset) section */}
        <WoMachineCard workOrderName={workOrder.name} />

        {/* Tabs */}
        <Tabs defaultValue="materials">
          <TabsList>
            <TabsTrigger value="materials">{t("materials")}</TabsTrigger>
            <TabsTrigger value="operations">{t("operations")}</TabsTrigger>
            <TabsTrigger value="actions">{t("quickManufacture")}</TabsTrigger>
          </TabsList>
          <TabsContent value="materials" className="mt-4">
            <WoMaterialsTab items={workOrder.required_items ?? []} />
          </TabsContent>
          <TabsContent value="operations" className="mt-4">
            <WoOperationsTab operations={workOrder.operations ?? []} />
          </TabsContent>
          <TabsContent value="actions" className="mt-4">
            <WoQuickActions workOrder={workOrder} onTabelOpen={() => setTabelOpen(true)} />
          </TabsContent>
        </Tabs>

        <WoTabelDialog open={tabelOpen} onOpenChange={setTabelOpen} workOrder={workOrder} />
      </div>
    </FormPageLayout>
  );
}
