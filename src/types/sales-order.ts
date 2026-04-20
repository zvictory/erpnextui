export interface SalesOrderItem {
  doctype: "Sales Order Item";
  item_code: string;
  qty: number;
  rate: number;
  amount: number;
  picked_qty?: number;
  item_name?: string;
  warehouse?: string;
  uom?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SalesOrder {
  name: string;
  doctype: "Sales Order";
  docstatus: 0 | 1 | 2;
  customer: string;
  transaction_date: string;
  delivery_date: string;
  company: string;
  items: SalesOrderItem[];
  total: number;
  grand_total: number;
  status: string;
  per_billed: number;
  per_delivered: number;
  amended_from?: string;
  workflow_state?: string;
  set_warehouse?: string;
  customer_name?: string;
  currency?: string;
  pick_notes?: string;
  packed_by?: string;
  packed_date?: string;
  [key: string]: unknown;
}

export interface SalesOrderListItem {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  grand_total: number;
  currency: string;
  status: string;
  docstatus: 0 | 1 | 2;
  per_billed: number;
  per_delivered: number;
  workflow_state?: string;
  set_warehouse?: string;
}
