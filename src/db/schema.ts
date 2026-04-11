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
