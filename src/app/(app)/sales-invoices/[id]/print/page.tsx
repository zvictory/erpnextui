"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesInvoicePrint } from "@/components/print/sales-invoice-print";
import { useSalesInvoice } from "@/hooks/use-sales-invoices";
import { useCompanyStore } from "@/stores/company-store";
import { useReceivableBalances } from "@/hooks/use-party-balances";

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const { data: invoice, isLoading } = useSalesInvoice(name);
  const { company } = useCompanyStore();
  const { balanceMap } = useReceivableBalances(company);

  const customerBalance = (() => {
    if (!invoice) return undefined;
    const pb = balanceMap.get(invoice.customer);
    if (!pb) return undefined;
    return pb.balances.reduce((sum, b) => sum + b.amount, 0);
  })();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="link" asChild className="mt-4">
          <Link href="/sales-invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="mx-auto max-w-[150mm] flex items-center justify-between py-4 px-2 print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/sales-invoices/${encodeURIComponent(name)}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* A5 preview with paper shadow */}
      <div className="bg-muted min-h-[60vh] py-8 px-4 print:bg-white print:p-0 print:min-h-0">
        <div
          className="mx-auto max-w-[150mm] rounded-lg shadow-xl bg-white print:shadow-none print:rounded-none"
          style={{ position: "relative" }}
        >
          <SalesInvoicePrint invoice={invoice} customerBalance={customerBalance} />
        </div>
      </div>
    </>
  );
}
