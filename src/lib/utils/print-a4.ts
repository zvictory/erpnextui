import { YUK_XATI_STYLES } from "./yuk-xati-styles";

export function printA4(contentHtml: string, title = "Yuk Xati") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const doc = printWindow.document;
  doc.open();

  // Build document using safe string construction — no user input in template
  const html = [
    "<!DOCTYPE html><html><head><meta charset='utf-8'>",
    "<title>" + title + "</title>",
    "<style>" + YUK_XATI_STYLES + "</style>",
    "</head><body>",
    contentHtml,
    "</body></html>",
  ].join("");

  doc.write(html);
  doc.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
