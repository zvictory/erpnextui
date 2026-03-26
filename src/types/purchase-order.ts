export interface PurchaseOrderItem {
  doctype: "Purchase Order Item";
  item_code: string;
  qty: number;
  rate: number;
  amount: number;
  [key: string]: unknown;
}

export interface PurchaseOrder {
  name: string;
  doctype: "Purchase Order";
  docstatus: 0 | 1 | 2;
  supplier: string;
  transaction_date: string;
  company: string;
  items: PurchaseOrderItem[];
  total: number;
  grand_total: number;
  status: string;
  per_billed: number;
  per_received: number;
  amended_from?: string;
  [key: string]: unknown;
}

export interface PurchaseOrderListItem {
  name: string;
  supplier: string;
  transaction_date: string;
  grand_total: number;
  currency: string;
  status: string;
  docstatus: 0 | 1 | 2;
  per_billed: number;
  per_received: number;
}
