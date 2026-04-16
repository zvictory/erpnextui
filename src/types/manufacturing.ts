// ── Work Order ──────────────────────────────────────────────

export interface WorkOrderListItem {
  name: string;
  production_item: string;
  item_name: string;
  bom_no: string;
  qty: number;
  produced_qty: number;
  status: WorkOrderStatus;
  planned_start_date: string;
  expected_delivery_date: string;
  company: string;
  docstatus: number;
}

export type WorkOrderStatus =
  | "Draft"
  | "Not Started"
  | "In Process"
  | "Completed"
  | "Stopped"
  | "Cancelled";

export interface WorkOrderRequiredItem {
  item_code: string;
  item_name: string;
  required_qty: number;
  transferred_qty: number;
  consumed_qty: number;
  source_warehouse: string;
  stock_uom: string;
}

export interface WorkOrderOperation {
  operation: string;
  workstation: string;
  time_in_mins: number;
  completed_qty: number;
  status: string;
  actual_operation_time: number;
  hour_rate: number;
  operating_cost: number;
}

export interface WorkOrder extends WorkOrderListItem {
  fg_warehouse: string;
  wip_warehouse: string;
  source_warehouse: string;
  additional_operating_cost: number;
  custom_total_labor_cost?: number;
  custom_labor_hours?: number;
  required_items: WorkOrderRequiredItem[];
  operations: WorkOrderOperation[];
  [key: string]: unknown;
}

// ── BOM ─────────────────────────────────────────────────────

export interface BOMListItem {
  name: string;
  item: string;
  item_name: string;
  quantity: number;
  is_active: number;
  is_default: number;
  total_cost: number;
  raw_material_cost: number;
  operating_cost: number;
}

export interface BOMItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  stock_uom: string;
  source_warehouse: string;
}

export interface BOMOperation {
  operation: string;
  workstation: string;
  time_in_mins: number;
  hour_rate: number;
  operating_cost: number;
  batch_size: number;
}

export interface BOM extends BOMListItem {
  items: BOMItem[];
  operations: BOMOperation[];
  [key: string]: unknown;
}

// ── Job Card ────────────────────────────────────────────────

export interface JobCardListItem {
  name: string;
  work_order: string;
  operation: string;
  workstation: string;
  for_quantity: number;
  total_completed_qty: number;
  status: JobCardStatus;
  production_item: string;
  item_name: string;
}

export type JobCardStatus = "Open" | "Work In Progress" | "Completed" | "Cancelled";

export interface JobCardTimeLog {
  from_time: string;
  to_time: string;
  time_in_mins: number;
  completed_qty: number;
}

export interface JobCardItem {
  item_code: string;
  item_name: string;
  required_qty: number;
  transferred_qty: number;
  uom: string;
}

export interface JobCard extends JobCardListItem {
  time_logs: JobCardTimeLog[];
  items: JobCardItem[];
  [key: string]: unknown;
}

// ── Workstation ─────────────────────────────────────────────

export interface WorkstationListItem {
  name: string;
  workstation_name: string;
  workstation_type: string;
  hour_rate: number;
}

export interface Workstation extends WorkstationListItem {
  hour_rate_electricity: number;
  hour_rate_consumable: number;
  hour_rate_rent: number;
  hour_rate_labour: number;
  custom_power_kw?: number;
  [key: string]: unknown;
}
