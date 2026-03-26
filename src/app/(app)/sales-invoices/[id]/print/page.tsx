"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThermalReceipt } from "@/components/receipts/thermal-receipt";
import { ReceiptSettingsPanel } from "@/components/receipts/receipt-settings-panel";
import { useSalesInvoice } from "@/hooks/use-sales-invoices";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useReceivableBalances } from "@/hooks/use-party-balances";
import { useReceiptSettingsStore } from "@/stores/receipt-settings-store";

export default function PrintReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const { data: invoice, isLoading } = useSalesInvoice(name);
  const {
    company,
    currencySymbol: companyCurrencySymbol,
    symbolOnRight: companySymbolOnRight,
  } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const settings = useReceiptSettingsStore();

  const invoiceCurrency = invoice?.currency;
  const currInfo = invoiceCurrency ? currencyMap?.get(invoiceCurrency) : undefined;
  const currencySymbol = currInfo?.symbol ?? companyCurrencySymbol;
  const symbolOnRight = currInfo?.onRight ?? companySymbolOnRight;
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Customer outstanding balance in the invoice currency
  const { balanceMap } = useReceivableBalances(company);
  const customerBalance = (() => {
    if (!invoice) return undefined;
    const partyBalances = balanceMap.get(invoice.customer);
    const cur = invoiceCurrency || "";
    const glBalance =
      partyBalances?.balances.find((b) => b.currency === cur)?.amount ?? 0;
    // Draft invoices (docstatus 0) aren't in GL yet — add their amount
    const adjustment = invoice.docstatus === 0 ? invoice.grand_total : 0;
    return glBalance + adjustment;
  })();

  const pageStyle = settings.paperWidth === "58mm" ? `@page { size: 58mm auto; margin: 2mm; }` : "";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="link" asChild className="mt-4">
          <Link href="/sales-invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {pageStyle && <style>{pageStyle}</style>}

      {/* Toolbar — hidden during print */}
      <div className="mx-auto max-w-md flex items-center justify-between py-4 px-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/sales-invoices/${encodeURIComponent(name)}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-1.5" />
            Settings
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Receipt preview */}
      <div className="bg-muted min-h-[60vh] py-8 px-4">
        <div className="mx-auto max-w-md rounded-lg shadow-md">
          <ThermalReceipt
            invoice={invoice}
            companyName={company}
            currencySymbol={currencySymbol}
            symbolOnRight={symbolOnRight}
            settings={settings}
            customerBalance={customerBalance}
          />
        </div>
      </div>

      <ReceiptSettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
