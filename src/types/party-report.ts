export interface CurrencyBalance {
  currency: string;
  amount: number;
}

export interface PartyBalances {
  balances: CurrencyBalance[];
  totalInBaseCurrency: number;
}

export interface PartySummaryRow {
  party: string;
  currency?: string;
  total_outstanding: number;
  [key: string]: unknown;
}

export interface ReportRunResponse {
  result: (PartySummaryRow | unknown[])[];
  columns: { fieldname: string; label: string }[];
}
