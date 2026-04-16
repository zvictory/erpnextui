// ── Asset Status ────────────────────────────────────────────
export type AssetStatus = "operational" | "maintenance" | "broken" | "retired";

export type DepreciationMethod = "straight_line" | "declining_balance";

// ── Asset ───────────────────────────────────────────────────

export interface Asset {
  id: number;
  assetCode: string;
  name: string;
  model: string | null;
  serialNumber: string | null;
  category: string | null;

  // Purchase
  purchaseDate: string;
  supplier: string | null;
  purchaseCost: number;

  // Location
  location: string | null;
  workstation: string | null;

  // Technical
  powerKw: number | null;
  capacity: string | null;
  technicalSpecs: string | null; // JSON string

  // Depreciation
  usefulLifeYears: number;
  salvageValue: number | null;
  depreciationMethod: DepreciationMethod | string | null;

  // Warranty
  warrantyUntil: string | null;

  // Status
  status: AssetStatus | string | null;

  // Extra
  qrCode: string | null;
  notes: string | null;
  photoUrl: string | null;

  createdAt: string | null;
  updatedAt: string | null;
}

export type AssetListItem = Pick<
  Asset,
  | "id"
  | "assetCode"
  | "name"
  | "category"
  | "purchaseDate"
  | "purchaseCost"
  | "status"
  | "location"
  | "usefulLifeYears"
  | "salvageValue"
  | "depreciationMethod"
>;

export interface AssetFormValues {
  name: string;
  model?: string;
  serialNumber?: string;
  category?: string;
  purchaseDate: string;
  supplier?: string;
  purchaseCost: number;
  location?: string;
  workstation?: string;
  powerKw?: number;
  capacity?: string;
  technicalSpecs?: string;
  usefulLifeYears: number;
  salvageValue?: number;
  depreciationMethod: DepreciationMethod;
  warrantyUntil?: string;
  status: AssetStatus;
  notes?: string;
  photoUrl?: string;
}

// ── Depreciation ────────────────────────────────────────────

export interface DepreciationInfo {
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
  monthsUsed: number;
  totalMonths: number;
  percentDepreciated: number;
}

// ── OEE ─────────────────────────────────────────────────────

export interface OEEMeasurement {
  id: number;
  assetId: number | null;
  date: string;
  plannedProductionTimeHours: number | null;
  downtimeHours: number | null;
  actualQty: number | null;
  capacityPerHour: number | null;
  goodQty: number | null;
  totalQty: number | null;
  availabilityPct: number | null;
  performancePct: number | null;
  qualityPct: number | null;
  oeePct: number | null;
  notes: string | null;
  createdAt: string | null;
}

export interface OEEFormValues {
  assetId: number;
  date: string;
  plannedProductionTimeHours: number;
  downtimeHours: number;
  actualQty: number;
  capacityPerHour: number;
  goodQty: number;
  totalQty: number;
  notes?: string;
}

export interface OEEResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export type OEERating = "world_class" | "good" | "average" | "low";

// ── Downtime Work Order Impact ──────────────────────────────

export interface DowntimeWorkOrderImpact {
  id: number;
  maintenanceLogId: number | null;
  workOrder: string;
  delayedByHours: number | null;
  qtyImpact: number | null;
}
