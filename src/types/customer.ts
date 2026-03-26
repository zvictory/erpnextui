import type { CurrencyBalance } from "@/types/party-report";

export interface Customer {
  name: string;
  customer_name: string;
  customer_type: "Company" | "Individual";
  customer_group: string;
  territory: string;
  default_currency: string;
  tax_id: string;
  email_id: string;
  mobile_no: string;
  [key: string]: unknown;
}

export interface CustomerListItem {
  name: string;
  customer_name: string;
  customer_type: string;
  customer_group: string;
  territory: string;
  default_currency?: string;
}

export interface CustomerWithBalance extends CustomerListItem {
  outstanding_balance: number | null;
  currency_balances: CurrencyBalance[];
}
