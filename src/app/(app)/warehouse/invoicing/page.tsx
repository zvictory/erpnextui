"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import {
  useWarehouseQueue,
  useCreateInvoiceFromSO,
  useWorkflowTransition,
} from "@/hooks/use-workflow";
import { useCompanyStore } from "@/stores/company-store";
import { formatDate } from "@/lib/formatters";
import { FileText } from "lucide-react";
import { toast } from "sonner";

export default function InvoicingPage() {
  const t = useTranslations("workflow");
  const { company } = useCompanyStore();
  const { data: orders = [], isLoading, refetch } = useWarehouseQueue(company, "To Invoice");
  const createInvoice = useCreateInvoiceFromSO();
  const transition = useWorkflowTransition();

  async function handleSpecialAction(action: string, orderName: string) {
    if (action === "Create Invoice") {
      try {
        const { siName } = await createInvoice.mutateAsync(orderName);
        // Advance SO to Invoiced
        await transition.mutateAsync({
          doctype: "Sales Order",
          docname: orderName,
          action: "Create Invoice",
        });
        toast.success(`${t("invoiceCreated")}: ${siName}`);
        refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create invoice");
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">{t("invoicingQueue")}</h1>
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
                {order.delivery_date && (
                  <p className="text-xs text-muted-foreground">
                    Delivery: {formatDate(order.delivery_date)}
                  </p>
                )}
                <WorkflowActions
                  doctype="Sales Order"
                  docname={order.name}
                  currentState="To Invoice"
                  onTransition={() => refetch()}
                  onSpecialAction={(action) => handleSpecialAction(action, order.name)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
