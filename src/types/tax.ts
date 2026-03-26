export interface TaxRow {
  charge_type: "On Net Total" | "On Previous Row Amount" | "On Previous Row Total" | "Actual";
  account_head: string;
  description: string;
  rate: number;
  tax_amount: number;
}

export interface TaxTemplate {
  name: string;
  title: string;
  taxes: TaxRow[];
}
