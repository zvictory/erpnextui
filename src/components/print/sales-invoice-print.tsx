"use client";

import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatters";
import type { SalesInvoice, SalesInvoiceItem } from "@/types/sales-invoice";

// ── Styles ──────────────────────────────────────────────────

const A5_PRINT_STYLES = `
@media print {
  @page {
    size: A5 portrait;
    margin: 5mm 5mm 10mm 5mm;
    @bottom-center {
      content: counter(page) " / " counter(pages);
      font-size: 7pt;
      font-family: Inter, system-ui, sans-serif;
      color: #999;
    }
  }
  body { margin: 0; padding: 0; }
  body * { visibility: hidden; }
  .a5-print, .a5-print * { visibility: visible; }
  .a5-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; box-sizing: border-box; }
  .no-print { display: none !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`;

// ── Types ───────────────────────────────────────────────────

interface SalesInvoicePrintProps {
  invoice: SalesInvoice;
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyTaxId?: string;
  customerBalance?: number;
}

// ── Helpers ─────────────────────────────────────────────────

function fmt(n: number): string {
  return formatNumber(n, 0);
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function parsePcsPerBox(itemName: string): number {
  const match = (itemName ?? "").match(/\((\d+)\)\s*$/);
  return match ? parseInt(match[1]) : 1;
}

function hasAnyDiscount(items: SalesInvoiceItem[]): boolean {
  return items.some(
    (i) =>
      (i.discount_percentage && i.discount_percentage > 0) ||
      (i.discount_amount && i.discount_amount > 0),
  );
}

// ── Component ───────────────────────────────────────────────

export function SalesInvoicePrint({
  invoice,
  companyName = "SURPRISE",
  companyPhone = "+998 55 500 13 33",
  companyAddress,
  companyTaxId,
  customerBalance,
}: SalesInvoicePrintProps) {
  const customerName =
    ((invoice as Record<string, unknown>).customer_name as string) || invoice.customer;
  const showDiscount = hasAnyDiscount(invoice.items);
  const validItems = invoice.items.filter((i) => i.item_code);

  const qrData = `https://app.erpstable.com/sales-invoices/${encodeURIComponent(invoice.name)}/print`;

  return (
    <>
      <style>{A5_PRINT_STYLES}</style>

      <div
        className="a5-print"
        style={{
          width: "148mm",
          minHeight: "200mm",
          margin: "0 auto",
          padding: "5mm",
          boxSizing: "border-box",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          fontSize: "9pt",
          color: "#111",
          lineHeight: 1.5,
          background: "#fff",
        }}
      >
        {/* ── Print button (screen only) ── */}
        <div className="no-print" style={{ position: "absolute", top: "4mm", right: "4mm" }}>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>

        {/* ── 1. Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "4mm",
          }}
        >
          <div>
            <div style={{ fontSize: "16pt", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {companyName}
            </div>
            {companyAddress && (
              <div style={{ fontSize: "7pt", color: "#666", maxWidth: "60mm" }}>
                {companyAddress}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", fontSize: "7.5pt", color: "#555" }}>
            <div>{companyPhone}</div>
            {companyTaxId && <div>ИНН: {companyTaxId}</div>}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1.5px solid #000", margin: "0 0 4mm" }} />

        {/* ── 2. Invoice meta ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4mm" }}>
          <div>
            <div
              style={{
                fontSize: "11pt",
                fontWeight: 700,
                fontFamily: "monospace",
                letterSpacing: "0.02em",
              }}
            >
              {invoice.name}
            </div>
            <div style={{ fontSize: "8pt", color: "#666" }}>{fmtDate(invoice.posting_date)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10pt", fontWeight: 600 }}>{customerName}</div>
            {typeof (invoice as Record<string, unknown>).customer_phone === "string" && (
              <div style={{ fontSize: "8pt", color: "#666" }}>
                {String((invoice as Record<string, unknown>).customer_phone)}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Items table ── */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "8pt",
            marginBottom: "3mm",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "1.5mm 1mm",
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "7pt",
                }}
              >
                #
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "1.5mm 1mm",
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "7pt",
                }}
              >
                Mahsulot
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "1.5mm 1mm",
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "7pt",
                }}
              >
                Soni
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "1.5mm 1mm",
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "7pt",
                }}
              >
                Birlik
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "1.5mm 1mm",
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "7pt",
                }}
              >
                Narxi
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "1.5mm 1mm",
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "7pt",
                }}
              >
                D N
              </th>
              {showDiscount && (
                <th
                  style={{
                    textAlign: "right",
                    padding: "1.5mm 1mm",
                    fontWeight: 600,
                    color: "#555",
                    fontSize: "7pt",
                  }}
                >
                  Ched %
                </th>
              )}
              <th
                style={{
                  textAlign: "right",
                  padding: "1.5mm 1mm",
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "7pt",
                }}
              >
                Summa
              </th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => (
              <tr
                key={item.item_code + idx}
                style={{
                  borderBottom: "0.5px solid #eee",
                  background: idx % 2 === 1 ? "#fafafa" : "transparent",
                }}
              >
                <td style={{ padding: "1.5mm 1mm", color: "#999", fontSize: "7pt" }}>{idx + 1}</td>
                <td style={{ padding: "1.5mm 1mm" }}>
                  <div style={{ fontWeight: 500 }}>{item.item_name || item.item_code}</div>
                  {item.item_name && item.item_code !== item.item_name && (
                    <div style={{ fontSize: "6.5pt", color: "#999", fontFamily: "monospace" }}>
                      {item.item_code}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "1.5mm 1mm",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatNumber(item.qty, item.qty % 1 === 0 ? 0 : 2)}
                </td>
                <td
                  style={{
                    textAlign: "center",
                    padding: "1.5mm 1mm",
                    color: "#666",
                    fontSize: "7pt",
                  }}
                >
                  {item.uom || "—"}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "1.5mm 1mm",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(item.rate)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "1.5mm 1mm",
                    fontVariantNumeric: "tabular-nums",
                    color: "#666",
                    fontSize: "7pt",
                  }}
                >
                  {(() => {
                    const pcs = parsePcsPerBox(item.item_name ?? "");
                    return pcs > 1 ? fmt(Math.round(item.rate / pcs)) : "—";
                  })()}
                </td>
                {showDiscount && (
                  <td
                    style={{
                      textAlign: "right",
                      padding: "1.5mm 1mm",
                      color: item.discount_percentage ? "#c00" : "#999",
                    }}
                  >
                    {item.discount_percentage ? `${item.discount_percentage}%` : "—"}
                  </td>
                )}
                <td
                  style={{
                    textAlign: "right",
                    padding: "1.5mm 1mm",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── 4. Totals ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "3mm" }}>
          <div style={{ width: "55mm", fontSize: "8.5pt" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "1mm 0",
                color: "#555",
              }}
            >
              <span>Subtotal</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(invoice.total)}</span>
            </div>
            {Number((invoice as Record<string, unknown>).discount_amount ?? 0) > 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "1mm 0",
                  color: "#c00",
                }}
              >
                <span>Chegirma</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  -{fmt(Number((invoice as Record<string, unknown>).discount_amount))}
                </span>
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2mm 0 1mm",
                borderTop: "1.5px solid #000",
                fontSize: "11pt",
                fontWeight: 700,
              }}
            >
              <span>Jami</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(invoice.grand_total)} сўм
              </span>
            </div>
          </div>
        </div>

        {/* ── 5. Balance ── */}
        {customerBalance != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: "8pt",
              color: "#666",
              marginBottom: "3mm",
            }}
          >
            <span>
              Balans:{" "}
              <strong style={{ color: customerBalance > 0 ? "#c00" : "#080" }}>
                {fmt(customerBalance)} сўм
              </strong>
            </span>
          </div>
        )}

        {/* ── 6. QR + Footer ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
            paddingTop: "4mm",
          }}
        >
          <div>
            <QRCodeSVG value={qrData} size={80} level="L" />
            <div style={{ fontSize: "6pt", color: "#999", marginTop: "1mm" }}>{invoice.name}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: "7pt", color: "#999" }}>
            <div>Xaridingiz uchun rahmat!</div>
            <div>Спасибо за покупку!</div>
            <div style={{ marginTop: "1mm" }}>erpstable.com</div>
          </div>
        </div>
      </div>
    </>
  );
}
