import { RECEIPT_STYLES } from "./receipt-styles";

export function printReceipt(receiptHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${RECEIPT_STYLES}</style>
</head>
<body>${receiptHtml}</body>
</html>`);
  doc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => document.body.removeChild(iframe), 1500);
}
