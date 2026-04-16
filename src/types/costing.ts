// ── Employee Cost Info ──────────────────────────────────────

export interface EmployeeCostInfo {
  name: string;
  employee_name: string;
  custom_monthly_salary: number;
  custom_standard_hours: number;
  custom_hourly_cost: number;
  custom_cost_classification: "Direct Labor" | "Period Cost";
  custom_default_workstation?: string;
  department?: string;
}

// ── Work Order Timesheet ───────────────────────────────────

export interface TimesheetEntry {
  name?: string;
  date: string;
  employee: string;
  employee_name: string;
  operation?: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  amount: number;
}

export interface WorkOrderTabel {
  work_order: string;
  employees: string[];
  entries: TimesheetEntry[];
  total_hours: number;
  total_amount: number;
}

// ── Costing Dashboard ──────────────────────────────────────

export interface ProductCostBreakdown {
  item_code: string;
  item_name: string;
  produced_qty: number;
  raw_material_cost: number;
  labor_cost: number;
  energy_cost: number;
  depreciation_cost: number;
  total_cost: number;
  cost_per_unit: number;
}

export type AllocationMethod = "qty" | "hours" | "value" | "manual";

export interface CostingPeriod {
  from: string;
  to: string;
  label: "today" | "week" | "month" | "custom";
}

export interface CumulativeCosts {
  raw_materials: number;
  labor: number;
  energy: number;
  depreciation: number;
  total: number;
  by_product: ProductCostBreakdown[];
}

export interface VarianceAnalysis {
  absorbed: number;
  actual: number;
  variance: number;
  variance_pct: number;
  recommendation: string;
}

export interface WorkstationEnergy {
  name: string;
  power_kw: number;
  share_pct: number;
  energy_amount: number;
  hourly_rate: number;
}
