export interface StockEntryDetail {
  doctype: "Stock Entry Detail";
  item_code: string;
  item_name?: string;
  qty: number;
  s_warehouse?: string;
  t_warehouse?: string;
  basic_rate: number;
  amount: number;
  uom?: string;
  serial_no?: string;
  [key: string]: unknown;
}

export interface StockEntry {
  name: string;
  doctype: "Stock Entry";
  docstatus: 0 | 1 | 2;
  stock_entry_type: "Material Receipt" | "Material Issue" | "Material Transfer";
  posting_date: string;
  company: string;
  from_warehouse?: string;
  to_warehouse?: string;
  items: StockEntryDetail[];
  total_amount: number;
  status: string;
  [key: string]: unknown;
}

export interface StockEntryListItem {
  name: string;
  stock_entry_type: string;
  posting_date: string;
  company: string;
  total_amount: number;
  status: string;
  docstatus: 0 | 1 | 2;
}

export interface StockLedgerEntry {
  name: string;
  item_code: string;
  item_name?: string;
  warehouse: string;
  posting_date: string;
  actual_qty: number;
  qty_after_transaction: number;
  valuation_rate: number;
  stock_value: number;
  voucher_type: string;
  voucher_no: string;
}

export interface BinEntry {
  item_code: string;
  item_name?: string;
  warehouse: string;
  actual_qty: number;
  stock_value: number;
  valuation_rate: number;
}
