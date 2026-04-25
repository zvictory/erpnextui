// Shared
export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportColumn {
  fieldname: string;
  label: string;
  fieldtype?: string;
  width?: number;
}

export interface ReportRunResponse {
  result: (Record<string, unknown> | unknown[])[];
  columns: ReportColumn[];
}

export interface PeriodKey {
  key: string;
  label: string;
}

// Account row (P&L + Balance Sheet)
export interface AccountRow {
  account: string;
  account_name: string;
  parent_account: string;
  indent: number;
  total: number;
  has_value: boolean;
  is_group: boolean;
  [periodKey: string]: string | number | boolean;
}

// Sales Analytics
export interface SalesRow {
  entity: string;
  entity_name: string;
  total: number;
  [periodKey: string]: string | number;
}

// Parsed report data
export interface SalesReportData {
  rows: SalesRow[];
  periods: PeriodKey[];
  totalSales: number;
  chartData: { period: string; amount: number }[];
}

export interface ProfitLossData {
  incomeAccounts: AccountRow[];
  expenseAccounts: AccountRow[];
  incomeTotal: number;
  expenseTotal: number;
  netProfitLoss: number;
  periods: PeriodKey[];
  chartData: { period: string; income: number; expenses: number }[];
}

export interface BalanceSheetData {
  assetAccounts: AccountRow[];
  liabilityAccounts: AccountRow[];
  equityAccounts: AccountRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  periods: PeriodKey[];
  compositionData: { name: string; value: number }[];
}

// Trial Balance
export interface TrialBalanceRow {
  account: string;
  account_name: string;
  parent_account: string;
  indent: number;
  opening_debit: number;
  opening_credit: number;
  debit: number;
  credit: number;
  closing_debit: number;
  closing_credit: number;
  [key: string]: string | number | boolean;
}

export interface TrialBalanceData {
  rows: TrialBalanceRow[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalDebit: number;
  totalCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
}

// Cash Flow
export interface CashFlowData {
  operatingAccounts: AccountRow[];
  investingAccounts: AccountRow[];
  financingAccounts: AccountRow[];
  totalOperating: number;
  totalInvesting: number;
  totalFinancing: number;
  netCashChange: number;
  periods: PeriodKey[];
}

// AR/AP Aging
export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export interface AgingRow {
  party: string;
  party_name: string;
  total_outstanding: number;
  currency?: string;
  current: number;
  "1-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
  [key: string]: string | number | undefined;
}

export interface AgingReportData {
  rows: AgingRow[];
  buckets: AgingBucket[];
  totalOutstanding: number;
  currencyBreakdown: Record<string, { total: number; buckets: AgingBucket[] }>;
}

// General Ledger
export interface GLReportRow {
  posting_date: string;
  account: string;
  party_type?: string;
  party?: string;
  debit: number;
  credit: number;
  debit_in_account_currency?: number;
  credit_in_account_currency?: number;
  account_currency?: string;
  balance: number;
  voucher_type: string;
  voucher_no: string;
  remarks?: string;
  [key: string]: string | number | undefined;
}

export interface GLReportData {
  rows: GLReportRow[];
  totalDebit: number;
  totalCredit: number;
  openingBalance: number;
  closingBalance: number;
}

// Sales by Item / Sales by Customer.
// Amounts are always in the company base currency. SBC `qty` sums stock-unit
// quantities across a customer's invoice items and may span different UOMs
// (same caveat as Sales Analytics grouped by Customer).
export interface SalesByItemRow {
  item_code: string;
  item_name: string;
  item_group?: string;
  currency: string;
  qty: number;
  stock_qty: number;
  stock_uom?: string;
  amount: number;
}

export interface SalesByItemData {
  rows: SalesByItemRow[];
  totalsByCurrency: Record<string, number>;
  totalCount: number;
  uniqueItemCount: number;
}

export interface SalesByCustomerRow {
  customer: string;
  customer_name: string;
  customer_group?: string;
  currency: string;
  invoice_count: number;
  qty: number;
  amount: number;
}

export interface SalesByCustomerData {
  rows: SalesByCustomerRow[];
  totalsByCurrency: Record<string, number>;
  totalCount: number;
  uniqueCustomerCount: number;
}

// Sales Analytics — quantity-only (no monetary fields). The dimension
// determines what identifies a row; monthly buckets are keyed "YYYY-MM".
// stockUom stays blank when grouping rolls up multiple UOMs (e.g. by Customer),
// in which case `qty` is a stock-unit count and must be displayed with a
// mixed-UOM hint.
export type SalesAnalyticsDimension = "item" | "itemGroup" | "customer" | "territory";

export interface SalesAnalyticsRow {
  key: string;
  label: string;
  secondaryLabel?: string;
  stockUom?: string;
  mixedUom: boolean;
  monthlyQty: Record<string, number>;
  totalQty: number;
  lineCount: number;
}

export interface SalesAnalyticsData {
  rows: SalesAnalyticsRow[];
  months: string[];
  totalQty: number;
  lineCount: number;
  uniqueCount: number;
  monthlyTotals: Record<string, number>;
  anyMixedUom: boolean;
}
