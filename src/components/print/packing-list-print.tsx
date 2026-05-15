"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatters";
import type { SalesOrder } from "@/types/sales-order";

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

interface PackingListPrintProps {
  order: SalesOrder;
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
}

function fmt(n: number): string {
  return formatNumber(n, 0);
}

function fmtQty(n: number): string {
  return formatNumber(n, n % 1 === 0 ? 0 : 2);
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function PackingListPrint({
  order,
  companyName = "SURPRISE",
  companyPhone = "+998 55 500 13 33",
  companyAddress,
}: PackingListPrintProps) {
  const customerName = order.customer_name || order.customer;
  const validItems = order.items.filter((i) => i.item_code);
  const totalItemCount = validItems.reduce((sum, i) => sum + (i.qty || 0), 0);
  const totalPickedCount = validItems.reduce((sum, i) => sum + (i.picked_qty || 0), 0);

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
        {/* Print button (screen only) */}
        <div className="no-print" style={{ position: "absolute", top: "4mm", right: "4mm" }}>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>

        {/* 1. Header */}
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
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1.5px solid #000", margin: "0 0 4mm" }} />

        {/* 2. Document title + meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4mm" }}>
          <div>
            <div style={{ fontSize: "11pt", fontWeight: 700 }}>PACKING LIST</div>
            <div
              style={{
                fontSize: "10pt",
                fontWeight: 700,
                fontFamily: "monospace",
                letterSpacing: "0.02em",
              }}
            >
              {order.name}
            </div>
            <div style={{ fontSize: "8pt", color: "#666" }}>{fmtDate(order.transaction_date)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10pt", fontWeight: 600 }}>{customerName}</div>
            {order.delivery_date && (
              <div style={{ fontSize: "8pt", color: "#666" }}>
                Delivery: {fmtDate(order.delivery_date)}
              </div>
            )}
            {order.set_warehouse && (
              <div style={{ fontSize: "7pt", color: "#888" }}>{order.set_warehouse}</div>
            )}
          </div>
        </div>

        {/* 3. Items table — NO PRICES */}
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
              {["#", "Item", "Ordered", "Picked", "UOM", "Warehouse"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === "Item" ? "left" : h === "#" ? "left" : "right",
                    padding: "1.5mm 1mm",
                    fontWeight: 600,
                    color: "#555",
                    fontSize: "7pt",
                    ...(h === "UOM" ? { textAlign: "center" as const } : {}),
                    ...(h === "Warehouse" ? { textAlign: "left" as const } : {}),
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const mismatch = (item.picked_qty ?? 0) !== item.qty;
              return (
                <tr
                  key={(item.name || item.item_code) + idx}
                  style={{
                    borderBottom: "0.5px solid #eee",
                    background: mismatch ? "#fff3cd" : idx % 2 === 1 ? "#fafafa" : "transparent",
                  }}
                >
                  <td style={{ padding: "1.5mm 1mm", color: "#999", fontSize: "7pt" }}>
                    {idx + 1}
                  </td>
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
                    {fmtQty(item.qty)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "1.5mm 1mm",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: mismatch ? 700 : 400,
                      color: mismatch ? "#c00" : "inherit",
                    }}
                  >
                    {fmtQty(item.picked_qty ?? 0)}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "1.5mm 1mm",
                      color: "#666",
                      fontSize: "7pt",
                    }}
                  >
                    {item.uom || "\u2014"}
                  </td>
                  <td
                    style={{
                      padding: "1.5mm 1mm",
                      color: "#666",
                      fontSize: "7pt",
                    }}
                  >
                    {item.warehouse || "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 4. Totals (item count, not money) */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4mm" }}>
          <div style={{ width: "55mm", fontSize: "8.5pt" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "1mm 0",
                color: "#555",
              }}
            >
              <span>Total items</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{validItems.length}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "1mm 0",
                color: "#555",
              }}
            >
              <span>Total qty ordered</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(totalItemCount)}</span>
            </div>
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
              <span>Total picked</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(totalPickedCount)}</span>
            </div>
          </div>
        </div>

        {/* 5. Signature lines */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8mm" }}>
          <div
            style={{
              width: "45%",
              borderTop: "1px solid #999",
              paddingTop: "2mm",
              fontSize: "7pt",
              color: "#666",
            }}
          >
            Packed by: ___________________
          </div>
          <div
            style={{
              width: "45%",
              borderTop: "1px solid #999",
              paddingTop: "2mm",
              fontSize: "7pt",
              color: "#666",
            }}
          >
            Verified by: ___________________
          </div>
        </div>

        {/* 6. Footer */}
        <div
          style={{
            marginTop: "6mm",
            textAlign: "center",
            fontSize: "7pt",
            color: "#999",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          INTERNAL WAREHOUSE DOCUMENT — NOT AN INVOICE
        </div>
      </div>
    </>
  );
}
