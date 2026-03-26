"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import { useWarehouseQueue } from "@/hooks/use-workflow";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { formatDate, formatInvoiceCurrency } from "@/lib/formatters";
import { PackageCheck } from "lucide-react";

export default function PackingPage() {
  const t = useTranslations("workflow");
  const { company } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useWarehouseQueue(company, "Picked");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">{t("packVerification")}</h1>
        </div>
        <Badge variant="secondary">{invoices.length}</Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          {t("noItems")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {invoices.map((inv) => {
            const info = currencyMap?.get(inv.currency);
            return (
              <Card key={inv.name}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {inv.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(inv.posting_date)}
                    </span>
                  </div>
                  <p className="font-semibold truncate">
                    {inv.customer_name || inv.customer}
                  </p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatInvoiceCurrency(
                      inv.grand_total,
                      inv.currency,
                      info,
                    )}
                  </p>
                  <WorkflowActions
                    doctype="Sales Invoice"
                    docname={inv.name}
                    currentState="Picked"
                    onTransition={() => refetch()}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
