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
  custom_standard_hours?: number;
  custom_hourly_cost?: number;
  custom_cost_classification?: "Direct Labor" | "Period Cost";
  custom_default_workstation?: string;
  [key: string]: unknown;
}

export interface EmployeeListItem {
  name: string;
  employee_name: string;
  designation: string;
  department: string;
  status: string;
  custom_hourly_cost?: number;
  custom_cost_classification?: "Direct Labor" | "Period Cost";
}

export interface EmployeeWithBalance extends EmployeeListItem {
  outstanding_balance: number;
  currency_balances: CurrencyBalance[];
}
