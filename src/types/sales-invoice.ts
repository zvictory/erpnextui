export interface SalesInvoiceItem {
  doctype: "Sales Invoice Item";
  item_code: string;
  item_name?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
  discount_percentage?: number;
  discount_amount?: number;
  [key: string]: unknown;
}

export interface SalesInvoice {
  name: string;
  doctype: "Sales Invoice";
  docstatus: 0 | 1 | 2;
  customer: string;
  posting_date: string;
  due_date: string;
  company: string;
  currency?: string;
  items: SalesInvoiceItem[];
  total: number;
  grand_total: number;
  status: string;
  amended_from?: string;
  is_return?: 0 | 1;
  return_against?: string;
  [key: string]: unknown;
}

export interface SalesInvoiceListItem {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  grand_total: number;
  currency: string;
  status: string;
  docstatus: 0 | 1 | 2;
  is_return?: 0 | 1;
}
