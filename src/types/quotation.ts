export interface QuotationItem {
  doctype: "Quotation Item";
  item_code: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
  [key: string]: unknown;
}

export interface Quotation {
  name: string;
  doctype: "Quotation";
  docstatus: 0 | 1 | 2;
  quotation_to: "Customer";
  party_name: string;
  customer_name?: string;
  transaction_date: string;
  valid_till: string;
  company: string;
  items: QuotationItem[];
  total: number;
  grand_total: number;
  status: string;
  [key: string]: unknown;
}

export interface QuotationListItem {
  name: string;
  party_name: string;
  customer_name: string;
  transaction_date: string;
  valid_till: string;
  grand_total: number;
  currency: string;
  status: string;
  docstatus: 0 | 1 | 2;
}
