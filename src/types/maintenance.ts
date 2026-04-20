// ── Maintenance Types ───────────────────────────────────────

export type MaintenanceType = "corrective" | "preventive" | "calibration" | "cleaning" | "capital";

export type ResolutionStatus =
  | "resolved"
  | "partially_resolved"
  | "unresolved"
  | "needs_replacement";

export type CostClassification = "operating_expense" | "capitalized";

export type FrequencyType =
  | "days"
  | "weeks"
  | "months"
  | "years"
  | "operating_hours"
  | "production_qty";

// ── Mechanic ────────────────────────────────────────────────

export interface Mechanic {
  id: number;
  employeeId: string;
  employeeName: string;
  hourlyRate: number;
  specialization: string | null;
  certifications: string | null; // JSON string
  active: number | null; // 0 | 1
  createdAt: string | null;
}

export interface MechanicFormValues {
  employeeId: string;
  employeeName: string;
  hourlyRate: number;
  specialization?: string;
  certifications?: string[];
}

// ── Maintenance Log ─────────────────────────────────────────

export interface MaintenanceLog {
  id: number;
  assetId: number | null;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  mechanicId: string;
  mechanicName: string;
  mechanicHourlyRate: number | null;
  mechanicCost: number | null;
  maintenanceType: MaintenanceType | string;
  reason: string;
  workDone: string | null;
  resolutionStatus: ResolutionStatus | string;
  partsCost: number | null;
  totalCost: number;
  approvedBy: string | null;
  approvedAt: string | null;
  costClassification: CostClassification | string | null;
  notes: string | null;
  attachments: string | null; // JSON string
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MaintenanceLogFormValues {
  assetId: number;
  date: string;
  startTime: string;
  endTime: string;
  mechanicId: string;
  maintenanceType: MaintenanceType;
  reason: string;
  workDone?: string;
  resolutionStatus: ResolutionStatus;
  costClassification?: CostClassification;
  notes?: string;
  partsUsed: MaintenancePartFormValues[];
}

// ── Maintenance Parts Used ──────────────────────────────────

export interface MaintenancePartUsed {
  id: number;
  maintenanceLogId: number | null;
  partName: string;
  partCode: string | null;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  sourceWarehouse: string | null;
  stockEntryName: string | null;
}

export interface MaintenancePartFormValues {
  partCode?: string;
  partName: string;
  qty: number;
  unitPrice: number;
}

// ── Spare Parts ─────────────────────────────────────────────

export interface SparePart {
  id: number;
  partCode: string;
  name: string;
  category: string | null;
  compatibleAssets: string | null; // JSON string of asset codes
  currentStock: number | null;
  minStock: number | null;
  reorderQty: number | null;
  lastPurchasePrice: number | null;
  preferredSupplier: string | null;
  storageLocation: string | null;
  active: number | null;
  createdAt: string | null;
}

export interface SparePartFormValues {
  partCode: string;
  name: string;
  category?: string;
  compatibleAssets?: string[];
  minStock?: number;
  reorderQty?: number;
  lastPurchasePrice?: number;
  preferredSupplier?: string;
  storageLocation?: string;
}

// ── Preventive Maintenance Schedule ─────────────────────────

export interface PreventiveSchedule {
  id: number;
  assetId: number | null;
  taskName: string;
  taskDescription: string | null;
  frequencyType: FrequencyType | string;
  frequencyValue: number;
  estimatedDurationHours: number | null;
  requiredParts: string | null; // JSON string of part codes
  lastPerformed: string | null;
  nextDue: string;
  assignedMechanic: string | null;
  active: number | null;
  createdAt: string | null;
}

export interface PreventiveScheduleFormValues {
  assetId: number;
  taskName: string;
  taskDescription?: string;
  frequencyType: FrequencyType;
  frequencyValue: number;
  estimatedDurationHours?: number;
  requiredParts?: string[];
  nextDue: string;
  assignedMechanic?: string;
}

// ── Dashboard aggregates ────────────────────────────────────

export interface MaintenanceDashboardKPIs {
  averageOEE: number;
  monthDowntimeHours: number;
  monthRepairCount: number;
  monthRepairCost: number;
}

export interface MechanicPerformance {
  mechanicId: string;
  mechanicName: string;
  totalLogs: number;
  totalHours: number;
  totalCost: number;
  avgResolutionRate: number; // % resolved
}

export interface MTBFMTTRResult {
  mtbf: number; // hours between failures
  mttr: number; // hours to repair
}
