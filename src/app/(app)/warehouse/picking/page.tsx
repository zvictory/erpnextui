"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import { ImeiScanner } from "@/components/shared/imei-scanner";
import { useWarehouseQueue } from "@/hooks/use-workflow";
import { useCompanyStore } from "@/stores/company-store";
import { formatDate } from "@/lib/formatters";
import { Package } from "lucide-react";

export default function PickingPage() {
  const t = useTranslations("workflow");
  const { company } = useCompanyStore();
  const [activeTab, setActiveTab] = useState<"pending" | "picking">("pending");
  const {
    data: pendingOrders = [],
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useWarehouseQueue(company, "Pending Pick");
  const {
    data: pickingOrders = [],
    isLoading: pickingLoading,
    refetch: refetchPicking,
  } = useWarehouseQueue(company, "Picking");

  const refetchAll = () => {
    refetchPending();
    refetchPicking();
  };

  function OrderCard({ order, state }: { order: (typeof pendingOrders)[number]; state: string }) {
    return (
      <Card key={order.name}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">{order.name}</span>
            <Badge variant="outline">{order.set_warehouse || "\u2014"}</Badge>
          </div>
          <div>
            <p className="font-semibold truncate">{order.customer_name || order.customer}</p>
            <p className="text-sm text-muted-foreground">{formatDate(order.transaction_date)}</p>
          </div>
          {order.delivery_date && (
            <p className="text-xs text-muted-foreground">
              Delivery: {formatDate(order.delivery_date)}
            </p>
          )}
          <ImeiScanner
            onScan={(imei) => {
              console.log(`Scanned ${imei} for ${order.name}`);
            }}
          />
          <WorkflowActions
            doctype="Sales Order"
            docname={order.name}
            currentState={state}
            onTransition={refetchAll}
          />
        </CardContent>
      </Card>
    );
  }

  const isLoading = pendingLoading || pickingLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">{t("pickList")}</h1>
        </div>
        <Badge variant="secondary">{pendingOrders.length + pickingOrders.length}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "picking")}>
        <TabsList>
          <TabsTrigger value="pending">
            {t("pendingPick")} ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="picking">
            {t("picking")} ({pickingOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              {t("noItems")}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingOrders.map((order) => (
                <OrderCard key={order.name} order={order} state="Pending Pick" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="picking">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : pickingOrders.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              {t("noItems")}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pickingOrders.map((order) => (
                <OrderCard key={order.name} order={order} state="Picking" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
