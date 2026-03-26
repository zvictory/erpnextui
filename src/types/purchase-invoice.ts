export interface PurchaseInvoiceItem {
  doctype: "Purchase Invoice Item";
  item_code?: string;
  expense_account?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  [key: string]: unknown;
}

export interface PurchaseInvoice {
  name: string;
  doctype: "Purchase Invoice";
  docstatus: 0 | 1 | 2;
  supplier: string;
  posting_date: string;
  due_date: string;
  company: string;
  items: PurchaseInvoiceItem[];
  total: number;
  grand_total: number;
  status: string;
  amended_from?: string;
  is_return?: 0 | 1;
  return_against?: string;
  [key: string]: unknown;
}

export interface PurchaseInvoiceListItem {
  name: string;
  supplier: string;
  posting_date: string;
  grand_total: number;
  currency: string;
  status: string;
  docstatus: 0 | 1 | 2;
  is_return?: 0 | 1;
}
