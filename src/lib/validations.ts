import { z } from "zod";

// ─── Production Run ─────────────────────────────────────────────────
export const createProductionRunSchema = z.object({
  date: z.string(),
  shift: z.string().optional(),
  lineId: z.number().int().positive(),
  productId: z.number().int().positive(),
  actualOutput: z.number().int().positive(),
  totalHours: z.number().positive(),
  plannedStopHours: z.number().min(0).default(0),
});

export const updateProductionRunSchema = z.object({
  id: z.number().int().positive(),
  date: z.string().optional(),
  shift: z.string().optional(),
  lineId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  actualOutput: z.number().int().positive().optional(),
  totalHours: z.number().positive().optional(),
  plannedStopHours: z.number().min(0).optional(),
});

// ─── Downtime Event ─────────────────────────────────────────────────
export const createDowntimeEventSchema = z.object({
  date: z.string(),
  lineId: z.number().int().positive(),
  stopCodeId: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  notes: z.string().optional(),
});

export const updateDowntimeEventSchema = z.object({
  id: z.number().int().positive(),
  date: z.string().optional(),
  lineId: z.number().int().positive().optional(),
  stopCodeId: z.number().int().positive().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// ─── Energy Log ─────────────────────────────────────────────────────
export const createEnergyLogSchema = z.object({
  date: z.string(),
  electricityKwh: z.number().min(0),
  gasM3: z.number().min(0),
});

export const updateEnergyLogSchema = z.object({
  id: z.number().int().positive(),
  date: z.string().optional(),
  electricityKwh: z.number().min(0).optional(),
  gasM3: z.number().min(0).optional(),
});

// ─── Product ────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().optional(),
  nominalSpeed: z.number().int().min(0),
  weightKg: z.number().min(0).optional(),
  piecesPerBox: z.number().int().min(0).optional(),
});

export const updateProductSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  unit: z.string().optional(),
  nominalSpeed: z.number().int().min(0).optional(),
  weightKg: z.number().min(0).optional(),
  piecesPerBox: z.number().int().min(0).optional(),
});

// ─── Production Line ────────────────────────────────────────────────
export const createLineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateLineSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

// ─── Settings ───────────────────────────────────────────────────────
export const updateSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
});

// ─── Type exports ───────────────────────────────────────────────────
export type CreateProductionRunInput = z.infer<typeof createProductionRunSchema>;
export type UpdateProductionRunInput = z.infer<typeof updateProductionRunSchema>;
export type CreateDowntimeEventInput = z.infer<typeof createDowntimeEventSchema>;
export type UpdateDowntimeEventInput = z.infer<typeof updateDowntimeEventSchema>;
export type CreateEnergyLogInput = z.infer<typeof createEnergyLogSchema>;
export type UpdateEnergyLogInput = z.infer<typeof updateEnergyLogSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateLineInput = z.infer<typeof createLineSchema>;
export type UpdateLineInput = z.infer<typeof updateLineSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
