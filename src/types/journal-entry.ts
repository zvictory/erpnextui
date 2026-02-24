export interface JournalEntryAccount {
  doctype: "Journal Entry Account";
  account: string;
  debit_in_account_currency?: number;
  credit_in_account_currency?: number;
}

export interface JournalEntry {
  name: string;
  doctype: "Journal Entry";
  docstatus: 0 | 1 | 2;
  voucher_type: string;
  naming_series: string;
  posting_date: string;
  company: string;
  user_remark?: string;
  total_debit: number;
  total_credit: number;
  accounts: JournalEntryAccount[];
  amended_from?: string;
  [key: string]: unknown;
}

export interface JournalEntryListItem {
  name: string;
  posting_date: string;
  total_debit: number;
  user_remark: string;
  docstatus: 0 | 1 | 2;
}
