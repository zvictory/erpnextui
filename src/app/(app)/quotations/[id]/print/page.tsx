"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQuotation } from "@/hooks/use-quotations";
import { useCompanyStore } from "@/stores/company-store";
import { formatDate } from "@/lib/formatters";
import { formatCurrency } from "@/lib/utils";

export default function PrintQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const t = useTranslations("invoices");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const { data: quotation, isLoading } = useQuotation(name);
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="mx-auto max-w-3xl py-8 text-center">
        <p className="text-muted-foreground">Quotation not found.</p>
        <Button variant="link" asChild className="mt-4">
          <Link href="/quotations">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print mx-auto flex max-w-3xl items-center justify-between px-2 py-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/quotations/${encodeURIComponent(name)}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          {tCommon("print")}
        </Button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 rounded-lg border bg-white p-8 text-black dark:bg-white dark:text-black">
        <div className="flex justify-between">
          <div>
            <h1 className="text-xl font-bold">{company}</h1>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold">Quotation</h2>
            <p className="text-sm text-gray-600">{quotation.name}</p>
          </div>
        </div>

        <Separator className="bg-gray-300" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-600">{t("customer")}</p>
            <p className="font-semibold">{quotation.customer_name || quotation.party_name}</p>
          </div>
          <div className="text-right">
            <div>
              <span className="text-gray-600">{t("date")}: </span>
              <span>{formatDate(quotation.transaction_date)}</span>
            </div>
            <div>
              <span className="text-gray-600">{tOrders("deliveryDate")}: </span>
              <span>{formatDate(quotation.valid_till)}</span>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 text-left font-medium">#</th>
              <th className="py-2 text-left font-medium">{t("item")}</th>
              <th className="py-2 text-right font-medium">{t("qty")}</th>
              <th className="py-2 text-right font-medium">{t("rate")}</th>
              <th className="py-2 text-right font-medium">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">{item.item_code}</td>
                <td className="py-2 text-right">{item.qty}</td>
                <td className="py-2 text-right">
                  {formatCurrency(item.rate, currencySymbol, symbolOnRight)}
                </td>
                <td className="py-2 text-right">
                  {formatCurrency(item.amount, currencySymbol, symbolOnRight)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("subtotal")}</span>
              <span>{formatCurrency(quotation.total, currencySymbol, symbolOnRight)}</span>
            </div>
            <Separator className="bg-gray-300" />
            <div className="flex justify-between font-bold">
              <span>{t("grandTotal")}</span>
              <span>{formatCurrency(quotation.grand_total, currencySymbol, symbolOnRight)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
