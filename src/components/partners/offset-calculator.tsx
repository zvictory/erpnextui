"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/formatters";
import { usePartnerStore } from "@/stores/partner-store";
import {
  useUnpaidSalesInvoices,
  useUnpaidPurchaseInvoices,
  useCreateOffset,
} from "@/lib/api/partners";
import { useCompanyStore } from "@/stores/company-store";

interface OffsetCalculatorProps {
  customerId: string;
  supplierId: string;
}

export function OffsetCalculator({ customerId, supplierId }: OffsetCalculatorProps) {
  const t = useTranslations("partners");
  const { company } = useCompanyStore();
  const { data: salesInvoices, isLoading: siLoading } = useUnpaidSalesInvoices(customerId);
  const { data: purchaseInvoices, isLoading: piLoading } = useUnpaidPurchaseInvoices(supplierId);

  const {
    selectedSalesInvoices,
    selectedPurchaseInvoices,
    offsetAmount,
    remainder,
    remainderDirection,
    toggleSalesInvoice,
    togglePurchaseInvoice,
    selectAllSales,
    selectAllPurchases,
    clearSelection,
  } = usePartnerStore();

  const createOffset = useCreateOffset();
  const [showPreview, setShowPreview] = useState(false);

  const isLoading = siLoading || piLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const hasSales = salesInvoices && salesInvoices.length > 0;
  const hasPurchases = purchaseInvoices && purchaseInvoices.length > 0;

  if (!hasSales && !hasPurchases) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t("noPartners")}</p>;
  }

  // Extract company abbreviation from any account name or use first letter
  const companyAbbr = company
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  function handleCreateOffset() {
    if (offsetAmount <= 0) return;

    createOffset.mutate(
      {
        customerId,
        supplierId,
        company,
        companyAbbr,
        offsetAmount,
        salesInvoices: selectedSalesInvoices,
        purchaseInvoices: selectedPurchaseInvoices,
        postingDate: new Date().toISOString().slice(0, 10),
      },
      {
        onSuccess: () => {
          toast.success(`Offset ${formatNumber(offsetAmount)} created`);
          clearSelection();
          setShowPreview(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("selectInvoices")}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales invoices (receivable) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{t("receivable")}</h4>
            {hasSales && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  selectAllSales(
                    salesInvoices!.map((i) => ({
                      name: i.name,
                      amount: i.outstanding_amount,
                    })),
                  )
                }
              >
                Select all
              </Button>
            )}
          </div>
          {salesInvoices?.map((inv) => {
            const isSelected = selectedSalesInvoices.some((s) => s.name === inv.name);
            return (
              <label
                key={inv.name}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50"
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSalesInvoice(inv.name, inv.outstanding_amount)}
                />
                <span className="font-mono text-sm">{inv.name}</span>
                <span className="ml-auto font-mono tabular-nums text-sm font-medium">
                  {formatNumber(inv.outstanding_amount)}
                </span>
              </label>
            );
          })}
          {!hasSales && <p className="text-sm text-muted-foreground">No unpaid sales invoices</p>}
        </div>

        {/* Purchase invoices (payable) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{t("payable")}</h4>
            {hasPurchases && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  selectAllPurchases(
                    purchaseInvoices!.map((i) => ({
                      name: i.name,
                      amount: i.outstanding_amount,
                    })),
                  )
                }
              >
                Select all
              </Button>
            )}
          </div>
          {purchaseInvoices?.map((inv) => {
            const isSelected = selectedPurchaseInvoices.some((s) => s.name === inv.name);
            return (
              <label
                key={inv.name}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50"
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => togglePurchaseInvoice(inv.name, inv.outstanding_amount)}
                />
                <span className="font-mono text-sm">{inv.name}</span>
                <span className="ml-auto font-mono tabular-nums text-sm font-medium">
                  {formatNumber(inv.outstanding_amount)}
                </span>
              </label>
            );
          })}
          {!hasPurchases && (
            <p className="text-sm text-muted-foreground">No unpaid purchase invoices</p>
          )}
        </div>
      </div>

      {/* Offset calculation result */}
      {offsetAmount > 0 && (
        <>
          <Separator />
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("offsetAmount")}</span>
                <span className="text-lg font-bold tabular-nums">{formatNumber(offsetAmount)}</span>
              </div>
              {remainder > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("remaining")}</span>
                  <span className="tabular-nums">
                    {formatNumber(remainder)} (
                    {remainderDirection === "they_pay" ? t("theyPay") : t("wePay")})
                  </span>
                </div>
              )}

              {/* Preview */}
              {showPreview && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                  <p className="font-medium">Journal Entry Preview:</p>
                  {selectedPurchaseInvoices.map((pi) => (
                    <p key={pi.name}>
                      Dr: Creditors ({supplierId}) —{" "}
                      {formatNumber(Math.min(pi.amount, offsetAmount))} → {pi.name}
                    </p>
                  ))}
                  {selectedSalesInvoices.map((si) => (
                    <p key={si.name}>
                      Cr: Debtors ({customerId}) — {formatNumber(Math.min(si.amount, offsetAmount))}{" "}
                      → {si.name}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? "Hide" : t("preview")}
                </Button>
                <Button size="sm" onClick={handleCreateOffset} disabled={createOffset.isPending}>
                  {createOffset.isPending ? "..." : t("createOffset")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
