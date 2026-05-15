export interface Partner {
  id: string;
  companyName: string;
  taxId: string | null;
  customerId: string;
  supplierId: string;
  currency: string;
  receivable: number;
  payable: number;
  netBalance: number;
  netDirection: "they_pay" | "we_pay" | "settled";
}

export interface PartnerInvoice {
  name: string;
  type: "sales" | "purchase";
  posting_date: string;
  grand_total: number;
  paid_amount: number;
  outstanding_amount: number;
  currency: string;
}

export interface OffsetEntry {
  salesInvoices: { name: string; amount: number }[];
  purchaseInvoices: { name: string; amount: number }[];
  offsetAmount: number;
  remainder: number;
  remainderDirection: "they_pay" | "we_pay" | "settled";
}
