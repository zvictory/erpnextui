export interface KpiData {
  totalSales: number;
  grossProfit: number;
  expenses: number;
  netIncome: number;
  totalSalesTrend: number;
  grossProfitTrend: number;
  expensesTrend: number;
  netIncomeTrend: number;
}

export interface SalesTrendPoint {
  date: string;
  amount: number;
}

export interface ProfitBreakdown {
  category: string;
  amount: number;
}

export interface RecentInvoice {
  name: string;
  customer: string;
  postingDate: string;
  grandTotal: number;
  currency?: string;
  status: "Paid" | "Unpaid" | "Overdue" | "Return" | "Credit Note Issued";
}

export interface BalanceSheetSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface DashboardData {
  kpi: KpiData;
  salesTrend: SalesTrendPoint[];
  profitBreakdown: ProfitBreakdown[];
  recentInvoices: RecentInvoice[];
  balanceSheet: BalanceSheetSummary;
}
