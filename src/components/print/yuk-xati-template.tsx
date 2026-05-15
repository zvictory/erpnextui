"use client";

import { formatNumber } from "@/lib/formatters";
import type { YukXatiData } from "@/lib/utils/invoice-to-yukxati";

const SIG_ROWS = [
  { key: "salesDept", label: "SOTUV BO'LIMI" },
  { key: "warehouseKeeper", label: "KAMERA MUDIRI" },
  { key: "driver", label: "HAYDOVCHI" },
  { key: "vehicleNumber", label: "MASHINA RAQAMI" },
  { key: "recipient", label: "QABUL QILUVCHI" },
] as const;

/** Builds raw HTML for A4 print window. All data from trusted ERPNext API. */
export function buildYukXatiHtml(data: YukXatiData): string {
  const itemRows = data.items
    .map(
      (item) =>
        `<tr>
          <td>${item.index}</td>
          <td class="name">${item.itemName}</td>
          <td class="num">${formatNumber(item.qtyBoxes, 0)}</td>
          <td>${item.pcsPerBox}</td>
          <td class="num">${formatNumber(item.totalPieces, 0)}</td>
          <td class="num">${formatNumber(item.pricePerPiece, 0)}</td>
          <td class="num">${formatNumber(item.totalAmount, 0)}</td>
        </tr>`,
    )
    .join("");

  const sigRows = SIG_ROWS.map((row) => {
    const fio = (data[row.key as keyof YukXatiData] as string) || "";
    return `<tr>
      <td class="sig-label">${row.label}:</td>
      <td class="sig-sign">(imzo)</td>
      <td class="sig-fio">${fio || "(F.I.O)"}</td>
    </tr>`;
  }).join("");

  return `<div class="yx">
    <div class="yx-header">
      <div>
        <div class="yx-company">${data.companyName}</div>
        <div class="yx-company-sub">${data.companySubtitle}</div>
      </div>
      <div>
        <div class="yx-title">YUK XATI</div>
        <div class="yx-docno">XATI № <span>${data.documentNumber}</span></div>
      </div>
    </div>
    <div class="yx-info"><span class="label">Mijoz:</span><span class="value">${data.customerName}</span></div>
    <div class="yx-date">${data.date}</div>
    <table class="yx-table">
      <thead>
        <tr>
          <th>№</th>
          <th>Mahsulot nomi</th>
          <th>Soni<br/>(korobka)</th>
          <th>Ul'chov birlik<br/>korobka</th>
          <th>Jami muzqaymoq<br/>soni (dona)</th>
          <th>Narxi</th>
          <th>Jami summa</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr class="total-row">
          <td colspan="6" style="text-align:right; padding-right:3mm;">Жами</td>
          <td class="num">${formatNumber(data.grandTotal, 0)}</td>
        </tr>
      </tbody>
    </table>
    <table class="yx-sigs">${sigRows}</table>
  </div>`;
}
