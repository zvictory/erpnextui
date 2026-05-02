export interface Account {
  name: string;
  account_name: string;
  account_number?: string;
  parent_account?: string;
  company: string;
  root_type: string;
  report_type: string;
  account_type: string;
  is_group: 0 | 1;
  disabled: 0 | 1;
}

export interface AccountWithCurrency {
  name: string;
  account_currency: string;
  balance?: number;
}

export interface TransferAccount {
  name: string;
  account_currency: string;
  balance: number;
  root_type: "Asset" | "Equity";
}

export interface AccountDetail extends Account {
  account_currency: string;
  bank_name?: string;
  bank_account_no?: string;
  root_type: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
}

export interface BankAccountListItem {
  name: string;
  account_name: string;
  account_currency: string;
  bank_name?: string;
  balance?: number;
}

export interface COAAccountListItem {
  name: string;
  account_name: string;
  account_type: string;
  account_currency: string;
  parent_account: string;
  is_group: 0 | 1;
  root_type: string;
  balance?: number;
  balance_in_base_currency?: number;
}

export interface GLEntry {
  name: string;
  posting_date: string;
  voucher_type: string;
  voucher_no: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  runningBalance?: number;
}

export interface LedgerEntry {
  name: string;
  posting_date: string;
  creation?: string; // "YYYY-MM-DD HH:MM:SS.ffffff"
  voucher_type: string;
  voucher_no: string;
  remarks?: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  debit: number;
  credit: number;
  account_currency: string;
  // computed client-side
  runningBalance?: number;
  runningBalanceBase?: number;
  exchangeRate?: number;
}
