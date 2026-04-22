import type { SalesInvoice } from "@/types/sales-invoice";

export interface YukXatiItem {
  index: number;
  itemName: string;
  qtyBoxes: number;
  pcsPerBox: number;
  totalPieces: number;
  pricePerPiece: number;
  totalAmount: number;
}

export interface YukXatiData {
  companyName: string;
  companySubtitle: string;
  documentNumber: string;
  date: string;
  customerName: string;
  items: YukXatiItem[];
  grandTotal: number;
  salesDept?: string;
  warehouseKeeper?: string;
  driver?: string;
  vehicleNumber?: string;
  recipient?: string;
}

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
];

export function mapSalesInvoiceToYukXati(invoice: SalesInvoice): YukXatiData {
  const items: YukXatiItem[] = invoice.items.map((item, idx) => {
    // Parse pcsPerBox from item_name: "ANJAN sgushyonka (20)" → 20
    const match = (item.item_name ?? "").match(/\((\d+)\)\s*$/);
    const pcsPerBox = match
      ? parseInt(match[1])
      : ((item as Record<string, unknown>).conversion_factor as number) || 1;

    const totalPieces = item.qty * pcsPerBox;
    // Derive per-piece price from the sacred line total, not from rate/pcsPerBox,
    // so qty × pricePerPiece reconciles exactly with the printed total.
    const pricePerPiece = totalPieces > 0 ? Math.round(item.amount / totalPieces) : item.rate;

    return {
      index: idx + 1,
      itemName: item.item_name ?? item.item_code,
      qtyBoxes: item.qty,
      pcsPerBox,
      totalPieces,
      pricePerPiece,
      totalAmount: item.amount,
    };
  });

  const d = new Date(invoice.posting_date);
  const dateStr = `${d.getDate()} ${MONTHS[d.getMonth()]}a ${d.getFullYear()} г.`;

  return {
    companyName: "Surprise",
    companySubtitle: "ice cream",
    documentNumber: invoice.name,
    date: dateStr,
    customerName:
      ((invoice as Record<string, unknown>).customer_name as string) || invoice.customer,
    items,
    grandTotal: invoice.grand_total,
  };
}
