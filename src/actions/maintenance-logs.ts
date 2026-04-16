"use server";

import { db } from "@/db";
import { maintenanceLogs, maintenancePartsUsed, mechanics, spareParts, assets } from "@/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import type { MaintenanceLogFormValues } from "@/types/maintenance";

// ─── List maintenance logs ─────────────────────────────────────────

interface LogFilters {
  assetId?: number;
  mechanicId?: string;
  maintenanceType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getMaintenanceLogs(filters?: LogFilters) {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getMaintenanceLogs",
    });

    const conditions = [];

    if (filters?.assetId) conditions.push(eq(maintenanceLogs.assetId, filters.assetId));
    if (filters?.mechanicId) conditions.push(eq(maintenanceLogs.mechanicId, filters.mechanicId));
    if (filters?.maintenanceType)
      conditions.push(eq(maintenanceLogs.maintenanceType, filters.maintenanceType));
    if (filters?.dateFrom) conditions.push(gte(maintenanceLogs.date, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(maintenanceLogs.date, filters.dateTo));

    const rows = await db
      .select({
        id: maintenanceLogs.id,
        assetId: maintenanceLogs.assetId,
        assetName: assets.name,
        assetCode: assets.assetCode,
        date: maintenanceLogs.date,
        startTime: maintenanceLogs.startTime,
        endTime: maintenanceLogs.endTime,
        durationHours: maintenanceLogs.durationHours,
        mechanicId: maintenanceLogs.mechanicId,
        mechanicName: maintenanceLogs.mechanicName,
        mechanicHourlyRate: maintenanceLogs.mechanicHourlyRate,
        mechanicCost: maintenanceLogs.mechanicCost,
        maintenanceType: maintenanceLogs.maintenanceType,
        reason: maintenanceLogs.reason,
        workDone: maintenanceLogs.workDone,
        resolutionStatus: maintenanceLogs.resolutionStatus,
        partsCost: maintenanceLogs.partsCost,
        totalCost: maintenanceLogs.totalCost,
        approvedBy: maintenanceLogs.approvedBy,
        approvedAt: maintenanceLogs.approvedAt,
        costClassification: maintenanceLogs.costClassification,
        notes: maintenanceLogs.notes,
        createdAt: maintenanceLogs.createdAt,
      })
      .from(maintenanceLogs)
      .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(maintenanceLogs.date));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch maintenance logs",
    };
  }
}

// ─── Get single log with parts ─────────────────────────────────────

export async function getMaintenanceLog(id: number) {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getMaintenanceLog",
    });

    const log = db.select().from(maintenanceLogs).where(eq(maintenanceLogs.id, id)).get();
    if (!log) return { success: false as const, error: "Log not found" };

    const parts = await db
      .select()
      .from(maintenancePartsUsed)
      .where(eq(maintenancePartsUsed.maintenanceLogId, id));

    return { success: true as const, data: { ...log, parts } };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch maintenance log",
    };
  }
}

// ─── Create maintenance log ────────────────────────────────────────

export async function createMaintenanceLog(data: MaintenanceLogFormValues) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "createMaintenanceLog",
    });

    // Look up mechanic info
    const mechanic = db
      .select()
      .from(mechanics)
      .where(eq(mechanics.employeeId, data.mechanicId))
      .get();

    const mechanicName = mechanic?.employeeName ?? data.mechanicId;
    const mechanicRate = mechanic?.hourlyRate ?? 0;

    // Calculate duration from start/end time
    const [sh, sm] = data.startTime.split(":").map(Number);
    const [eh, em] = data.endTime.split(":").map(Number);
    const durationHours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);

    // Calculate parts cost
    const partsCost = data.partsUsed.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
    const mechanicCost = durationHours * mechanicRate;
    const totalCost = mechanicCost + partsCost;

    // Determine cost classification
    const costClassification =
      data.costClassification ??
      (data.maintenanceType === "capital" ? "capitalized" : "operating_expense");

    const result = db
      .insert(maintenanceLogs)
      .values({
        assetId: data.assetId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        durationHours,
        mechanicId: data.mechanicId,
        mechanicName,
        mechanicHourlyRate: mechanicRate,
        mechanicCost,
        maintenanceType: data.maintenanceType,
        reason: data.reason,
        workDone: data.workDone ?? null,
        resolutionStatus: data.resolutionStatus,
        partsCost,
        totalCost,
        costClassification,
        notes: data.notes ?? null,
      })
      .returning()
      .get();

    // Insert parts used
    if (data.partsUsed.length > 0) {
      for (const part of data.partsUsed) {
        db.insert(maintenancePartsUsed)
          .values({
            maintenanceLogId: result.id,
            partName: part.partName,
            partCode: part.partCode ?? null,
            qty: part.qty,
            unitPrice: part.unitPrice,
            totalPrice: part.qty * part.unitPrice,
          })
          .run();

        // Decrease spare part stock if part_code matches
        if (part.partCode) {
          db.update(spareParts)
            .set({
              currentStock: sql`MAX(0, ${spareParts.currentStock} - ${part.qty})`,
            })
            .where(eq(spareParts.partCode, part.partCode))
            .run();
        }
      }
    }

    revalidatePath("/maintenance/logs");
    revalidatePath("/maintenance/spare-parts");
    revalidatePath(`/assets/${data.assetId}`);

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create maintenance log",
    };
  }
}

// ─── Dashboard KPIs ────────────────────────────────────────────────

export async function getMaintenanceDashboardKPIs(month?: string) {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getMaintenanceDashboardKPIs",
    });

    // Default to current month
    const now = new Date();
    const monthStart =
      month ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const [y, m] = monthStart.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

    const logs = await db
      .select({
        durationHours: maintenanceLogs.durationHours,
        totalCost: maintenanceLogs.totalCost,
      })
      .from(maintenanceLogs)
      .where(and(gte(maintenanceLogs.date, monthStart), lte(maintenanceLogs.date, nextMonth)));

    const monthDowntimeHours = logs.reduce((s, l) => s + (l.durationHours ?? 0), 0);
    const monthRepairCount = logs.length;
    const monthRepairCost = logs.reduce((s, l) => s + (l.totalCost ?? 0), 0);

    return {
      success: true as const,
      data: {
        monthDowntimeHours,
        monthRepairCount,
        monthRepairCost,
      },
    };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch KPIs",
    };
  }
}
