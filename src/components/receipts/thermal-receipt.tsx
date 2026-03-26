"use client";

import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { SalesInvoice, SalesInvoiceItem } from "@/types/sales-invoice";
import type { ReceiptFontSize, PaperWidth, ItemDisplay } from "@/stores/receipt-settings-store";

/** Compute correct display amount from discount fields (handles buggy stored data). */
function getDisplayAmount(item: SalesInvoiceItem): number {
  if (item.discount_percentage && item.discount_percentage > 0) {
    return item.qty * item.rate * (1 - item.discount_percentage / 100);
  }
  if (item.discount_amount && item.discount_amount > 0) {
    return item.qty * item.rate - item.discount_amount;
  }
  return item.amount;
}

export interface ReceiptSettings {
  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  paperWidth: PaperWidth;
  fontSize: ReceiptFontSize;
  showQrCode: boolean;
  showCustomerName: boolean;
  showDueDate: boolean;
  showItemRate: boolean;
  itemDisplay: ItemDisplay;
  showItemUom: boolean;
  footerText: string;
}

interface ThermalReceiptProps {
  invoice: SalesInvoice;
  companyName: string;
  currencySymbol: string;
  symbolOnRight: boolean;
  settings: ReceiptSettings;
  /** Customer's outstanding balance in the invoice currency (including this invoice). */
  customerBalance?: number;
}

const FONT_SIZE: Record<ReceiptFontSize, string> = {
  small: "text-[10px]",
  medium: "text-xs",
  large: "text-sm",
};

const CONTENT_WIDTH: Record<PaperWidth, string> = {
  "80mm": "max-w-[72mm]",
  "58mm": "max-w-[48mm]",
};

function Separator() {
  return <div className="border-t border-dashed border-current opacity-40 my-1" />;
}

function fmt(value: number, symbol: string, onRight: boolean) {
  return formatCurrency(value, symbol, onRight);
}

export function ThermalReceipt({
  invoice,
  companyName,
  currencySymbol,
  symbolOnRight,
  settings,
  customerBalance,
}: ThermalReceiptProps) {
  const t = useTranslations("receipt");

  // Compute corrected totals from discount fields (handles buggy stored amounts)
  const correctedItemAmounts = invoice.items.map(getDisplayAmount);
  const correctedTotal = correctedItemAmounts.reduce((sum, a) => sum + a, 0);
  const preDiscountTotal = invoice.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const hasItemDiscounts = correctedTotal < preDiscountTotal - 0.01;
  const itemDiscount = hasItemDiscounts ? preDiscountTotal - correctedTotal : 0;

  return (
    <div
      className={`thermal-receipt ${CONTENT_WIDTH[settings.paperWidth]} ${FONT_SIZE[settings.fontSize]} mx-auto w-full bg-white text-black p-4`}
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Header */}
      <div className="text-center space-y-0.5">
        <div className="font-bold text-base leading-tight">{companyName}</div>
        {settings.headerLine1 && <div>{settings.headerLine1}</div>}
        {settings.headerLine2 && <div>{settings.headerLine2}</div>}
        {settings.headerLine3 && <div>{settings.headerLine3}</div>}
      </div>

      <Separator />

      {/* Invoice info */}
      <div className="space-y-0.5">
        <div>{t("invoice")}: {invoice.name}</div>
        <div>{t("date")}: {formatDate(invoice.posting_date)}</div>
        {settings.showDueDate && invoice.due_date && <div>{t("due")}: {formatDate(invoice.due_date)}</div>}
        {settings.showCustomerName && <div>{t("customer")}: {(invoice as Record<string, unknown>).customer_name as string || invoice.customer}</div>}
      </div>

      <Separator />

      {/* Items */}
      <div className="space-y-1.5">
        {invoice.items.map((item, idx) => {
          const name = item.item_name || item.item_code;
          const hasDiscPct = (item.discount_percentage ?? 0) > 0;
          const hasDiscAmt = !hasDiscPct && (item.discount_amount ?? 0) > 0;
          return (
            <div key={idx}>
              {/* Item name — full width */}
              <div className="font-bold truncate">{name}</div>
              {/* Qty × Rate → Amount */}
              <div className="flex justify-between gap-2">
                <span className="opacity-60">
                  {item.qty} x {fmt(item.rate, currencySymbol, symbolOnRight)}
                  {settings.showItemUom && item.uom ? ` (${item.uom})` : ""}
                </span>
                <span className="whitespace-nowrap">
                  {fmt(correctedItemAmounts[idx], currencySymbol, symbolOnRight)}
                </span>
              </div>
              {hasDiscPct && (
                <div className="flex justify-between gap-2 text-[0.85em] opacity-50">
                  <span>{t("discount")} -{item.discount_percentage}%</span>
                  <span>-{fmt(item.qty * item.rate * (item.discount_percentage! / 100), currencySymbol, symbolOnRight)}</span>
                </div>
              )}
              {hasDiscAmt && (
                <div className="flex justify-between gap-2 text-[0.85em] opacity-50">
                  <span>{t("discount")}</span>
                  <span>-{fmt(item.discount_amount!, currencySymbol, symbolOnRight)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-0.5">
        {hasItemDiscounts && (
          <>
            <div className="flex justify-between">
              <span>{t("subtotal")}:</span>
              <span>{fmt(preDiscountTotal, currencySymbol, symbolOnRight)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("discount")}:</span>
              <span>-{fmt(itemDiscount, currencySymbol, symbolOnRight)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold">
          <span>{t("total")}:</span>
          <span>
            {fmt(
              correctedTotal + (invoice.grand_total - invoice.total),
              currencySymbol,
              symbolOnRight,
            )}
          </span>
        </div>
      </div>

      {/* Customer balance */}
      {customerBalance != null && (
        <>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>{t("balance")}:</span>
            <span>{fmt(customerBalance, currencySymbol, symbolOnRight)}</span>
          </div>
        </>
      )}

      {/* QR Code */}
      {settings.showQrCode && (
        <>
          <Separator />
          <div className="flex justify-center py-2">
            <QRCodeSVG value={invoice.name} size={80} />
          </div>
        </>
      )}

      {/* Footer — use translated default when empty */}
      <Separator />
      <div className="text-center whitespace-pre-line">
        {settings.footerText || t("thankYou")}
      </div>
    </div>
  );
}
