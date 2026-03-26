export interface GLEntry {
  name: string;
  posting_date: string;
  account: string;
  debit: number;
  credit: number;
  account_currency: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  voucher_type: string;
  voucher_no: string;
  remarks: string;
}
