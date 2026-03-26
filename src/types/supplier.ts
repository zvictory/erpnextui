import type { CurrencyBalance } from "@/types/party-report";

export interface Supplier {
  name: string;
  supplier_name: string;
  supplier_type: "Company" | "Individual";
  supplier_group: string;
  default_currency: string;
  tax_id: string;
  email_id: string;
  mobile_no: string;
  [key: string]: unknown;
}

export interface SupplierListItem {
  name: string;
  supplier_name: string;
  supplier_type: string;
  supplier_group: string;
  default_currency?: string;
}

export interface SupplierWithBalance extends SupplierListItem {
  outstanding_balance: number | null;
  currency_balances: CurrencyBalance[];
}
