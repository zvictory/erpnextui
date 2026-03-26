export interface DeliveryNoteItem {
  doctype: "Delivery Note Item";
  item_code: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse?: string;
  against_sales_order?: string;
  so_detail?: string;
  [key: string]: unknown;
}

export interface DeliveryNote {
  name: string;
  doctype: "Delivery Note";
  docstatus: 0 | 1 | 2;
  customer: string;
  posting_date: string;
  company: string;
  items: DeliveryNoteItem[];
  total: number;
  grand_total: number;
  status: string;
  [key: string]: unknown;
}

export interface DeliveryNoteListItem {
  name: string;
  customer: string;
  posting_date: string;
  grand_total: number;
  currency: string;
  status: string;
  docstatus: 0 | 1 | 2;
}
