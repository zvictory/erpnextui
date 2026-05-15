"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyStore } from "@/stores/company-store";
import { usePartnerDetail, useUnlinkPartner } from "@/lib/api/partners";
import { usePartnerStore } from "@/stores/partner-store";
import { BalanceSummary } from "@/components/partners/balance-summary";
import { SalesTab } from "@/components/partners/sales-tab";
import { PurchaseTab } from "@/components/partners/purchase-tab";
import { OffsetCalculator } from "@/components/partners/offset-calculator";
import { PaymentHistoryTab } from "@/components/partners/payment-history";

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const customerId = decodeURIComponent(id);
  const router = useRouter();
  const t = useTranslations("partners");
  const { company } = useCompanyStore();
  const { data, isLoading } = usePartnerDetail(customerId, company);
  const unlinkPartner = useUnlinkPartner();
  const clearSelection = usePartnerStore((s) => s.clearSelection);

  // Clear offset selections when navigating to a new partner
  useEffect(() => {
    clearSelection();
  }, [customerId, clearSelection]);

  function handleUnlink() {
    if (!data?.supplierId) return;
    unlinkPartner.mutate(
      { customerId, supplierId: data.supplierId },
      {
        onSuccess: () => {
          toast.success(t("unlinkPartner") + " — OK");
          router.push("/partners");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/partners")}>
          <ArrowLeft className="mr-2 size-4" />
          {t("title")}
        </Button>
        <p className="text-muted-foreground">Partner not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-3"
            onClick={() => router.push("/partners")}
          >
            <ArrowLeft className="mr-1 size-4" />
            {t("title")}
          </Button>
          <h1 className="text-2xl font-bold">{data.customer.customer_name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {data.customer.tax_id && <span>INN: {data.customer.tax_id}</span>}
            <Badge variant="outline" className="text-[10px]">
              Customer: {data.customer.name}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Vendor: {data.supplierId}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnlink}
          disabled={unlinkPartner.isPending}
          className="text-destructive"
        >
          <Unlink className="mr-1 size-3.5" />
          {t("unlinkPartner")}
        </Button>
      </div>

      {/* Balance summary cards */}
      <BalanceSummary
        receivable={data.receivable}
        payable={data.payable}
        currency={data.customer.default_currency || "UZS"}
      />

      {/* Tabs */}
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">{t("salesInvoices")}</TabsTrigger>
          <TabsTrigger value="purchase">{t("purchaseInvoices")}</TabsTrigger>
          <TabsTrigger value="offset">{t("offset")}</TabsTrigger>
          <TabsTrigger value="history">{t("paymentHistory")}</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="mt-4">
          <SalesTab customerId={customerId} />
        </TabsContent>
        <TabsContent value="purchase" className="mt-4">
          <PurchaseTab supplierId={data.supplierId} />
        </TabsContent>
        <TabsContent value="offset" className="mt-4">
          <OffsetCalculator customerId={customerId} supplierId={data.supplierId} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <PaymentHistoryTab customerId={customerId} supplierId={data.supplierId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
