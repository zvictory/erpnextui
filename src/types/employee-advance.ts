export interface EmployeeAdvance {
  name: string;
  employee: string;
  employee_name: string;
  posting_date: string;
  advance_amount: number;
  paid_amount: number;
  claimed_amount: number;
  return_amount: number;
  purpose: string;
  status: string;
  advance_account: string;
  company: string;
  docstatus: 0 | 1 | 2;
  currency: string;
  [key: string]: unknown;
}

export interface EmployeeAdvanceListItem {
  name: string;
  employee: string;
  employee_name: string;
  posting_date: string;
  advance_amount: number;
  paid_amount: number;
  claimed_amount: number;
  return_amount: number;
  purpose: string;
  status: string;
  docstatus: 0 | 1 | 2;
  currency: string;
}
