"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductHeader } from "@/components/products/product-header";
import { StockByWarehouse } from "@/components/products/stock-by-warehouse";
import { TransactionTimeline } from "@/components/products/transaction-timeline";
import { PurchaseHistoryTab } from "@/components/products/purchase-history-tab";
import { SalesHistoryTab } from "@/components/products/sales-history-tab";
import { ManufacturingTab } from "@/components/products/manufacturing-tab";
import { StockMovementChart } from "@/components/products/stock-movement-chart";
import { useItem } from "@/hooks/use-items";
import { useItemBins } from "@/hooks/use-stock-ledger";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const t = useTranslations("products.detail");

  const { data: item, isLoading: itemLoading } = useItem(name);
  const { data: bins = [], isLoading: binsLoading } = useItemBins(item?.item_code ?? "");

  const totalStock = useMemo(() => bins.reduce((sum, b) => sum + b.actual_qty, 0), [bins]);

  // Loading skeleton
  if (itemLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not found
  if (!item) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Product Not Found</h1>
        </div>
        <p className="text-muted-foreground">This product does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top bar: back + edit */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href={`/products/${encodeURIComponent(name)}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            {t("edit")}
          </Link>
        </Button>
      </div>

      {/* Header: name, badges, stats */}
      <ProductHeader item={item} totalStock={totalStock} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("transactions")}</TabsTrigger>
          <TabsTrigger value="purchases">{t("purchaseHistory")}</TabsTrigger>
          <TabsTrigger value="sales">{t("salesHistory")}</TabsTrigger>
          <TabsTrigger value="manufacturing">{t("manufacturing")}</TabsTrigger>
          <TabsTrigger value="movements">{t("stockMovements")}</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-6">
          <StockByWarehouse bins={bins} isLoading={binsLoading} />
          <StockMovementChart itemCode={item.item_code} />
        </TabsContent>

        {/* Transactions tab */}
        <TabsContent value="transactions">
          <TransactionTimeline itemCode={item.item_code} />
        </TabsContent>

        {/* Purchase History tab */}
        <TabsContent value="purchases">
          <PurchaseHistoryTab itemCode={item.item_code} />
        </TabsContent>

        {/* Sales History tab */}
        <TabsContent value="sales">
          <SalesHistoryTab itemCode={item.item_code} />
        </TabsContent>

        {/* Manufacturing tab */}
        <TabsContent value="manufacturing">
          <ManufacturingTab itemCode={item.item_code} />
        </TabsContent>

        {/* Stock Movements tab */}
        <TabsContent value="movements">
          <StockMovementChart itemCode={item.item_code} />
          <div className="mt-4">
            <TransactionTimeline itemCode={item.item_code} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
