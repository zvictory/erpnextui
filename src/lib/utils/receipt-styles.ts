export const RECEIPT_STYLES = `
@page { size: 80mm auto; margin: 0; }
@media print {
  * { font-weight: bold !important; page-break-inside: avoid; }
  html, body { height: auto !important; overflow: visible !important; }
  table { page-break-inside: avoid; }
}
body {
  margin: 0; padding: 1mm 4mm; width: 72mm;
  font-family: "Courier New", "Lucida Console", monospace;
  font-size: 16px; font-weight: bold; line-height: 1.5; color: #000;
}
.receipt-header { text-align: center; font-size: 28px; font-weight: 900; letter-spacing: 1px; margin-bottom: 1mm; }
.receipt-phone { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 3mm; }
.receipt-client { font-size: 16px; font-weight: 900; margin: 2mm 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.receipt-meta { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 2mm 0 3mm; }
.receipt-line { border-top: 2px dashed #000; margin: 1.5mm 0; }
.receipt-line-bold { border-top: 3px solid #000; margin: 1.5mm 0; }
.receipt-items { width: 100%; border-collapse: collapse; font-size: 15px; font-weight: bold; }
.receipt-items th { text-align: left; font-weight: 900; font-size: 16px; padding: 1mm 0; border-bottom: 2px dashed #000; }
.receipt-items td { padding: 0.5mm 0; font-weight: bold; }
.receipt-items .r { text-align: right; font-variant-numeric: tabular-nums; }
.receipt-item-name { font-size: 14px; font-weight: bold; }
.receipt-item-row td { padding-top: 1.5mm; }
.receipt-item-detail { padding-left: 3mm; font-size: 14px; display: flex; justify-content: space-between; }
.receipt-amt { font-size: 16px; font-weight: 900; font-variant-numeric: tabular-nums; text-align: right; }
.receipt-total { font-size: 22px; font-weight: 900; text-align: right; margin: 3mm 0; padding-top: 2mm; border-top: 3px solid #000; }
.receipt-balance { font-size: 16px; font-weight: 900; text-align: right; margin-top: 2mm; padding-top: 1mm; border-top: 2px dashed #000; }
`;
