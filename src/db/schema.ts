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
