import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Production Lines ────────────────────────────────────────────────
export const productionLines = sqliteTable("production_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order"),
});

// ─── Products ────────────────────────────────────────────────────────
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit"),
  nominalSpeed: integer("nominal_speed").notNull(),
  weightKg: real("weight_kg"),
  piecesPerBox: integer("pieces_per_box"),
});

// ─── Production Runs ─────────────────────────────────────────────────
export const productionRuns = sqliteTable("production_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  shift: text("shift"),
  lineId: integer("line_id").references(() => productionLines.id),
  productId: integer("product_id").references(() => products.id),
  actualOutput: integer("actual_output").notNull(),
  totalHours: real("total_hours").notNull(),
  plannedStopHours: real("planned_stop_hours").default(0),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Stop Codes ──────────────────────────────────────────────────────
export const stopCodes = sqliteTable("stop_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  nameUz: text("name_uz").notNull(),
  category: text("category"),
});

// ─── Downtime Events ─────────────────────────────────────────────────
export const downtimeEvents = sqliteTable("downtime_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  lineId: integer("line_id").references(() => productionLines.id),
  stopCodeId: integer("stop_code_id").references(() => stopCodes.id),
  durationMinutes: integer("duration_minutes").notNull(),
  notes: text("notes"),
});

// ─── Energy Logs ─────────────────────────────────────────────────────
export const energyLogs = sqliteTable("energy_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  electricityKwh: real("electricity_kwh"),
  gasM3: real("gas_m3"),
});

// ─── Settings ────────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

// ─── Permissions: custom capabilities (DB-defined extensions) ────────
export const customCapabilities = sqliteTable("custom_capabilities", {
  id: text("id").primaryKey(),
  module: text("module").notNull(),
  labelKey: text("label_key").notNull(),
  scopeDim: text("scope_dim"),
  tenant: text("tenant").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Permissions: user grants (capability × scope) ───────────────────
export const userCapabilities = sqliteTable("user_capabilities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenant: text("tenant").notNull(),
  userEmail: text("user_email").notNull(),
  capabilityId: text("capability_id").notNull(),
  scopeDim: text("scope_dim").notNull(),
  scopeValue: text("scope_value").notNull(),
  grantedBy: text("granted_by").notNull(),
  grantedAt: text("granted_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Permissions: role templates (named capability bundles) ──────────
export const roleTemplates = sqliteTable("role_templates", {
  id: text("id").primaryKey(),
  tenant: text("tenant").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const roleTemplateItems = sqliteTable("role_template_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: text("template_id")
    .notNull()
    .references(() => roleTemplates.id, { onDelete: "cascade" }),
  capabilityId: text("capability_id").notNull(),
  defaultScopeDim: text("default_scope_dim").notNull(),
});

// ─── Permissions: audit log (grants, revokes, denials) ───────────────
export const permissionAudit = sqliteTable("permission_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  event: text("event").notNull(),
  tenant: text("tenant").notNull(),
  userEmail: text("user_email").notNull(),
  capabilityId: text("capability_id").notNull(),
  scopeDim: text("scope_dim"),
  scopeValue: text("scope_value"),
  actorEmail: text("actor_email").notNull(),
  occurredAt: text("occurred_at").default(sql`(CURRENT_TIMESTAMP)`),
  details: text("details"),
});

// ─── Permissions: Phase 0 dry-run log ────────────────────────────────
export const permissionAuditDryrun = sqliteTable("permission_audit_dryrun", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenant: text("tenant").notNull(),
  userEmail: text("user_email").notNull(),
  capabilityId: text("capability_id").notNull(),
  scopeDim: text("scope_dim"),
  scopeValue: text("scope_value"),
  actionName: text("action_name").notNull(),
  occurredAt: text("occurred_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ═══════════════════════════════════════════════════════════════════════
// ASSET & MAINTENANCE MODULE
// ═══════════════════════════════════════════════════════════════════════

// ─── Assets (machine registry) ──────────────────────────────────────
export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetCode: text("asset_code").notNull().unique(),
  name: text("name").notNull(),
  model: text("model"),
  serialNumber: text("serial_number"),
  category: text("category"), // Mixer, Freezer, Pump, Packing, etc.

  // Purchase
  purchaseDate: text("purchase_date").notNull(),
  supplier: text("supplier"),
  purchaseCost: real("purchase_cost").notNull(),

  // Location
  location: text("location"),
  workstation: text("workstation"), // ERPNext Workstation name

  // Technical specs
  powerKw: real("power_kw"),
  capacity: text("capacity"),
  technicalSpecs: text("technical_specs"), // JSON string

  // Depreciation
  usefulLifeYears: integer("useful_life_years").notNull(),
  salvageValue: real("salvage_value").default(0),
  depreciationMethod: text("depreciation_method").default("straight_line"), // straight_line | declining_balance

  // Warranty
  warrantyUntil: text("warranty_until"),

  // Status
  status: text("status").default("operational"), // operational | maintenance | broken | retired

  // Extra
  qrCode: text("qr_code"),
  notes: text("notes"),
  photoUrl: text("photo_url"),

  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Mechanics ──────────────────────────────────────────────────────
export const mechanics = sqliteTable("mechanics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: text("employee_id").notNull().unique(), // ERPNext Employee
  employeeName: text("employee_name").notNull(),
  hourlyRate: real("hourly_rate").notNull(),
  specialization: text("specialization"), // Electrical, Mechanical, Refrigeration
  certifications: text("certifications"), // JSON string
  active: integer("active").default(1), // 0 | 1
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Maintenance Logs ───────────────────────────────────────────────
export const maintenanceLogs = sqliteTable("maintenance_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetId: integer("asset_id").references(() => assets.id, { onDelete: "cascade" }),

  // Time
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  durationHours: real("duration_hours").notNull(),

  // Mechanic
  mechanicId: text("mechanic_id").notNull(),
  mechanicName: text("mechanic_name").notNull(),
  mechanicHourlyRate: real("mechanic_hourly_rate"),
  mechanicCost: real("mechanic_cost"),

  // Type: corrective | preventive | calibration | cleaning | capital
  maintenanceType: text("maintenance_type").notNull(),

  // Reason & work
  reason: text("reason").notNull(),
  workDone: text("work_done"),

  // Resolution: resolved | partially_resolved | unresolved | needs_replacement
  resolutionStatus: text("resolution_status").notNull(),

  // Costs
  partsCost: real("parts_cost").default(0),
  totalCost: real("total_cost").notNull(),

  // Approval
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),

  // Cost classification: operating_expense | capitalized
  costClassification: text("cost_classification").default("operating_expense"),

  notes: text("notes"),
  attachments: text("attachments"), // JSON string

  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Maintenance Parts Used (child of maintenance_logs) ─────────────
export const maintenancePartsUsed = sqliteTable("maintenance_parts_used", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  maintenanceLogId: integer("maintenance_log_id").references(() => maintenanceLogs.id, {
    onDelete: "cascade",
  }),

  partName: text("part_name").notNull(),
  partCode: text("part_code"),
  qty: real("qty").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),

  // Stock entry link
  sourceWarehouse: text("source_warehouse"),
  stockEntryName: text("stock_entry_name"),
});

// ─── Spare Parts Catalog ────────────────────────────────────────────
export const spareParts = sqliteTable("spare_parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partCode: text("part_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"), // Sensor, Bearing, Belt, etc.

  compatibleAssets: text("compatible_assets"), // JSON string of asset codes

  // Stock
  currentStock: real("current_stock").default(0),
  minStock: real("min_stock").default(0),
  reorderQty: real("reorder_qty"),

  // Pricing
  lastPurchasePrice: real("last_purchase_price"),
  preferredSupplier: text("preferred_supplier"),

  // Storage
  storageLocation: text("storage_location"),

  active: integer("active").default(1),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Preventive Maintenance Schedule ────────────────────────────────
export const preventiveMaintenanceSchedule = sqliteTable("preventive_maintenance_schedule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetId: integer("asset_id").references(() => assets.id, { onDelete: "cascade" }),

  taskName: text("task_name").notNull(),
  taskDescription: text("task_description"),

  // Frequency: days | weeks | months | years | operating_hours | production_qty
  frequencyType: text("frequency_type").notNull(),
  frequencyValue: integer("frequency_value").notNull(),

  estimatedDurationHours: real("estimated_duration_hours"),
  requiredParts: text("required_parts"), // JSON string of part codes

  lastPerformed: text("last_performed"),
  nextDue: text("next_due").notNull(),

  assignedMechanic: text("assigned_mechanic"),

  active: integer("active").default(1),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── OEE Measurements (daily per asset) ─────────────────────────────
export const oeeMeasurements = sqliteTable("oee_measurements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetId: integer("asset_id").references(() => assets.id, { onDelete: "cascade" }),

  date: text("date").notNull(),

  // Availability = (Planned - Downtime) / Planned
  plannedProductionTimeHours: real("planned_production_time_hours"),
  downtimeHours: real("downtime_hours").default(0),

  // Performance = Actual / (Capacity × Run time)
  actualQty: real("actual_qty"),
  capacityPerHour: real("capacity_per_hour"),

  // Quality = Good / Total
  goodQty: real("good_qty"),
  totalQty: real("total_qty"),

  // Calculated percentages
  availabilityPct: real("availability_pct"),
  performancePct: real("performance_pct"),
  qualityPct: real("quality_pct"),
  oeePct: real("oee_pct"),

  notes: text("notes"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Work Order → Asset link ────────────────────────────────────────
export const workOrderAssets = sqliteTable("work_order_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workOrder: text("work_order").notNull(),
  assetId: integer("asset_id").references(() => assets.id),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── Downtime → Work Order Impact ───────────────────────────────────
export const downtimeWorkOrderImpact = sqliteTable("downtime_work_order_impact", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  maintenanceLogId: integer("maintenance_log_id").references(() => maintenanceLogs.id),
  workOrder: text("work_order").notNull(), // ERPNext Work Order name
  delayedByHours: real("delayed_by_hours"),
  qtyImpact: real("qty_impact"),
});
