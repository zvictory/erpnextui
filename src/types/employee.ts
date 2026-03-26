import type { CurrencyBalance } from "@/types/party-report";

export interface Employee {
  name: string;
  employee_name: string;
  designation: string;
  department: string;
  cell_phone: string;
  personal_email: string;
  company: string;
  status: string;
  date_of_joining: string;
  image: string;
  custom_monthly_salary?: number;
  [key: string]: unknown;
}

export interface EmployeeListItem {
  name: string;
  employee_name: string;
  designation: string;
  department: string;
  status: string;
}

export interface EmployeeWithBalance extends EmployeeListItem {
  outstanding_balance: number;
  currency_balances: CurrencyBalance[];
}
