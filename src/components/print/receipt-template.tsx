"use client";

import { formatNumber } from "@/lib/formatters";
import type { SalesInvoice } from "@/types/sales-invoice";

function parsePcsPerBox(itemName: string): number {
  const match = (itemName ?? "").match(/\((\d+)\)\s*$/);
  return match ? parseInt(match[1]) : 1;
}

interface ReceiptItem {
  name: string;
  qty: number;
  pcsPerBox: number;
  donaNarx: number;
  amount: number;
}

function mapItems(invoice: SalesInvoice): ReceiptItem[] {
  return invoice.items
    .filter((item) => item.item_code)
    .map((item) => {
      const pcsPerBox = parsePcsPerBox(item.item_name ?? "");
      const totalPieces = item.qty * pcsPerBox;
      return {
        name: item.item_name ?? item.item_code,
        qty: item.qty,
        pcsPerBox,
        donaNarx: pcsPerBox > 1 ? Math.round(item.amount / totalPieces) : item.rate,
        amount: item.amount,
      };
    });
}

/** Builds raw HTML for iframe printing. Data from trusted ERPNext API. */
export function buildReceiptHtml(
  invoice: SalesInvoice,
  companyName = "SURPRISE",
  companyPhone = "+998 55 500 13 33",
  customerBalance?: number,
): string {
  const customerName =
    ((invoice as Record<string, unknown>).customer_name as string) || invoice.customer;
  const items = mapItems(invoice);
  const invoiceNum = invoice.name;

  // 2-line: line 1 = name, line 2 = qty × pcsPerBox × donaNarx = amount
  const rows = items
    .map((item) => {
      const formula =
        item.pcsPerBox > 1
          ? `${formatNumber(item.qty, 0)} x ${item.pcsPerBox} x ${formatNumber(item.donaNarx, 0)}`
          : `${formatNumber(item.qty, 0)} x ${formatNumber(item.donaNarx, 0)}`;
      return (
        `<tr class="receipt-item-row"><td class="receipt-item-name">${item.name}</td></tr>` +
        `<tr><td class="receipt-item-detail"><span>${formula}</span><span class="receipt-amt">= ${formatNumber(item.amount, 0)}</span></td></tr>`
      );
    })
    .join("");

  const balanceLine =
    customerBalance != null
      ? `<div class="receipt-balance">Balans: ${formatNumber(customerBalance, 0)}</div>`
      : "";

  return [
    `<div class="receipt-header">${companyName}</div>`,
    `<div class="receipt-phone">${companyPhone}</div>`,
    `<div class="receipt-line-bold"></div>`,
    `<div class="receipt-client">Mijoz: ${customerName}</div>`,
    `<div class="receipt-meta"><span>${invoice.posting_date}</span><span># ${invoiceNum}</span></div>`,
    `<div class="receipt-line"></div>`,
    `<table class="receipt-items"><tr><th>Mahsulot</th></tr>${rows}</table>`,
    `<div class="receipt-total">Jami: ${formatNumber(invoice.grand_total, 0)}</div>`,
    balanceLine,
    `<div class="receipt-line-bold"></div>`,
  ].join("\n");
}

/** React preview component (screen only) */
export function ReceiptPreview({
  invoice,
  companyName = "SURPRISE",
  companyPhone = "+998 55 500 13 33",
  customerBalance,
}: {
  invoice: SalesInvoice;
  companyName?: string;
  companyPhone?: string;
  customerBalance?: number;
}) {
  const customerName =
    ((invoice as Record<string, unknown>).customer_name as string) || invoice.customer;
  const items = mapItems(invoice);
  const invoiceNum = invoice.name;

  const base = {
    fontFamily: '"Courier New", "Lucida Console", monospace',
    fontWeight: "bold" as const,
    color: "#000",
  };

  return (
    <div style={{ ...base, width: "72mm", fontSize: "16px", lineHeight: 1.5, padding: "1mm 4mm" }}>
      <div style={{ textAlign: "center", fontSize: "28px", fontWeight: 900 }}>{companyName}</div>
      <div
        style={{ textAlign: "center", fontSize: "18px", fontWeight: "bold", marginBottom: "3mm" }}
      >
        {companyPhone}
      </div>
      <hr style={{ border: "none", borderTop: "3px solid #000" }} />
      <div
        style={{
          fontSize: "16px",
          fontWeight: 900,
          margin: "2mm 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        Mijoz: {customerName}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "16px",
          fontWeight: "bold",
          margin: "2mm 0 3mm",
        }}
      >
        <span>{invoice.posting_date}</span>
        <span># {invoiceNum}</span>
      </div>
      <hr style={{ border: "none", borderTop: "2px dashed #000" }} />

      {items.map((item, i) => (
        <div key={i} style={{ marginTop: "1.5mm" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold" }}>{item.name}</div>
          <div
            style={{
              fontSize: "14px",
              paddingLeft: "2mm",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              {item.pcsPerBox > 1
                ? `${formatNumber(item.qty, 0)} x ${item.pcsPerBox} x ${formatNumber(item.donaNarx, 0)}`
                : `${formatNumber(item.qty, 0)} x ${formatNumber(item.donaNarx, 0)}`}
            </span>
            <span style={{ fontSize: "16px", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
              = {formatNumber(item.amount, 0)}
            </span>
          </div>
        </div>
      ))}

      <div
        style={{
          fontSize: "22px",
          fontWeight: 900,
          textAlign: "right",
          marginTop: "3mm",
          paddingTop: "2mm",
          borderTop: "3px solid #000",
        }}
      >
        Jami: {formatNumber(invoice.grand_total, 0)}
      </div>
      {customerBalance != null && (
        <div
          style={{
            fontSize: "16px",
            fontWeight: 900,
            textAlign: "right",
            marginTop: "2mm",
            paddingTop: "1mm",
            borderTop: "2px dashed #000",
          }}
        >
          Balans: {formatNumber(customerBalance, 0)}
        </div>
      )}
      <hr style={{ border: "none", borderTop: "3px solid #000", marginTop: "2mm" }} />
    </div>
  );
}
