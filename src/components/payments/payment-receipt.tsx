"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useCompanyStore } from "@/stores/company-store";
import { usePaymentEntry } from "@/hooks/use-payment-entries";
import { formatDate } from "@/lib/formatters";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentName: string;
}

const PRINT_STYLES = `
  body { font-family: system-ui, sans-serif; padding: 24px; color: #000; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e5e5; }
  th { font-weight: 600; font-size: 0.85em; color: #666; }
  .text-right { text-align: right; }
`;

export function PaymentReceipt({ open, onOpenChange, paymentName }: PaymentReceiptProps) {
  const t = useTranslations("payments");
  const tCommon = useTranslations("common");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: payment, isLoading } = usePaymentEntry(paymentName);
  const contentRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const el = contentRef.current;
    if (!el) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const style = printWindow.document.createElement("style");
    style.textContent = PRINT_STYLES;
    printWindow.document.head.appendChild(style);
    printWindow.document.title = paymentName;

    // Clone our rendered receipt content into the print window (safe DOM copy)
    const clone = el.cloneNode(true) as HTMLElement;
    printWindow.document.body.appendChild(clone);
    printWindow.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("title")} - {paymentName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : payment ? (
          <>
            <div ref={contentRef} className="space-y-4 text-sm">
              <div className="flex justify-between">
                <div>
                  <p className="text-lg font-bold">{company}</p>
                  <p className="text-muted-foreground">{t("title")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{payment.name}</p>
                  <p>{formatDate(payment.posting_date)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">{t("paymentType")}</p>
                  <p className="font-medium">{payment.payment_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("party")}</p>
                  <p className="font-medium">{payment.party_name || payment.party}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {payment.payment_type === "Receive" ? t("depositTo") : t("payFrom")}
                  </p>
                  <p className="font-medium">
                    {payment.payment_type === "Receive" ? payment.paid_to : payment.paid_from}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("paymentAmount")}</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(payment.paid_amount, currencySymbol, symbolOnRight)}
                  </p>
                </div>
              </div>

              {payment.reference_no && (
                <div>
                  <p className="text-muted-foreground">{t("referenceNo")}</p>
                  <p className="font-medium">{payment.reference_no}</p>
                </div>
              )}

              {payment.remarks && (
                <div>
                  <p className="text-muted-foreground">{t("remarks")}</p>
                  <p>{payment.remarks}</p>
                </div>
              )}

              {payment.references?.length > 0 && (
                <div>
                  <Separator />
                  <p className="mt-2 mb-1 font-medium">{t("outstandingInvoices")}</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1.5 text-left">{t("invoice")}</th>
                        <th className="py-1.5 text-right">{t("original")}</th>
                        <th className="py-1.5 text-right">{t("allocate")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payment.references.map((ref, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-1.5">{ref.reference_name}</td>
                          <td className="py-1.5 text-right">
                            {formatCurrency(ref.total_amount, currencySymbol, symbolOnRight)}
                          </td>
                          <td className="py-1.5 text-right">
                            {formatCurrency(ref.allocated_amount, currencySymbol, symbolOnRight)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handlePrint}>
                <Printer className="mr-1.5 h-4 w-4" />
                {tCommon("print")}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Payment not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
