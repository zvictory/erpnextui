"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import { useWarehouseQueue } from "@/hooks/use-workflow";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { formatDate, formatInvoiceCurrency } from "@/lib/formatters";

export default function ApprovalsPage() {
  const t = useTranslations("workflow");
  const { company } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useWarehouseQueue(company, "Pending Approval");
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("approvalQueue")}</h1>
        <Badge variant="secondary">{invoices.length}</Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          {t("noItems")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {invoices.map((inv) => {
            const info = currencyMap?.get(inv.currency);
            return (
              <Card
                key={inv.name}
                className="cursor-pointer hover:ring-1 hover:ring-ring transition-all"
                onClick={() =>
                  router.push(
                    `/sales-invoices/${encodeURIComponent(inv.name)}`,
                  )
                }
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {inv.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(inv.posting_date)}
                    </span>
                  </div>
                  <div>
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
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <WorkflowActions
                      doctype="Sales Invoice"
                      docname={inv.name}
                      currentState="Pending Approval"
                      onTransition={() => refetch()}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
