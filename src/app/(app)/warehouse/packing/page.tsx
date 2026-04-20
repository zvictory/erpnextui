"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import { useWarehouseQueue } from "@/hooks/use-workflow";
import { useCompanyStore } from "@/stores/company-store";
import { formatDate } from "@/lib/formatters";
import { PackageCheck, Printer } from "lucide-react";

export default function PackingPage() {
  const t = useTranslations("workflow");
  const { company } = useCompanyStore();
  const { data: orders = [], isLoading, refetch } = useWarehouseQueue(company, "Packed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">{t("packVerification")}</h1>
        </div>
        <Badge variant="secondary">{orders.length}</Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          {t("noItems")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.name}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{order.name}</span>
                  <Badge variant="outline">{order.set_warehouse || "\u2014"}</Badge>
                </div>
                <div>
                  <p className="font-semibold truncate">{order.customer_name || order.customer}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.transaction_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/warehouse/packing/${encodeURIComponent(order.name)}/print`}>
                    <Button variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-1" />
                      {t("printPackingList")}
                    </Button>
                  </Link>
                </div>
                <WorkflowActions
                  doctype="Sales Order"
                  docname={order.name}
                  currentState="Packed"
                  onTransition={() => refetch()}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
