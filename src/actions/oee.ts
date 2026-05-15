"use server";

import { db } from "@/db";
import { oeeMeasurements, assets } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import { calculateOEE } from "@/lib/utils/oee";
import type { OEEFormValues } from "@/types/asset";

// ─── List OEE measurements ─────────────────────────────────────────

interface OEEFilters {
  assetId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function getOEEMeasurements(filters?: OEEFilters) {
  try {
    await requireGrant({
      capability: "asset.read",
      scope: { dim: null },
      actionName: "getOEEMeasurements",
    });

    const conditions = [];

    if (filters?.assetId) conditions.push(eq(oeeMeasurements.assetId, filters.assetId));
    if (filters?.dateFrom) conditions.push(gte(oeeMeasurements.date, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(oeeMeasurements.date, filters.dateTo));

    const rows = await db
      .select({
        id: oeeMeasurements.id,
        assetId: oeeMeasurements.assetId,
        assetName: assets.name,
        assetCode: assets.assetCode,
        date: oeeMeasurements.date,
        plannedProductionTimeHours: oeeMeasurements.plannedProductionTimeHours,
        downtimeHours: oeeMeasurements.downtimeHours,
        actualQty: oeeMeasurements.actualQty,
        capacityPerHour: oeeMeasurements.capacityPerHour,
        goodQty: oeeMeasurements.goodQty,
        totalQty: oeeMeasurements.totalQty,
        availabilityPct: oeeMeasurements.availabilityPct,
        performancePct: oeeMeasurements.performancePct,
        qualityPct: oeeMeasurements.qualityPct,
        oeePct: oeeMeasurements.oeePct,
        notes: oeeMeasurements.notes,
        createdAt: oeeMeasurements.createdAt,
      })
      .from(oeeMeasurements)
      .leftJoin(assets, eq(oeeMeasurements.assetId, assets.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(oeeMeasurements.date));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch OEE measurements",
    };
  }
}

// ─── Create OEE measurement ────────────────────────────────────────

export async function createOEEMeasurement(data: OEEFormValues) {
  try {
    await requireGrant({
      capability: "asset.write",
      scope: { dim: null },
      actionName: "createOEEMeasurement",
    });

    // Calculate OEE from inputs
    const oeeResult = calculateOEE({
      plannedProductionTimeHours: data.plannedProductionTimeHours,
      downtimeHours: data.downtimeHours,
      actualQty: data.actualQty,
      capacityPerHour: data.capacityPerHour,
      goodQty: data.goodQty,
      totalQty: data.totalQty,
    });

    const result = db
      .insert(oeeMeasurements)
      .values({
        assetId: data.assetId,
        date: data.date,
        plannedProductionTimeHours: data.plannedProductionTimeHours,
        downtimeHours: data.downtimeHours,
        actualQty: data.actualQty,
        capacityPerHour: data.capacityPerHour,
        goodQty: data.goodQty,
        totalQty: data.totalQty,
        availabilityPct: oeeResult.availability,
        performancePct: oeeResult.performance,
        qualityPct: oeeResult.quality,
        oeePct: oeeResult.oee,
        notes: data.notes ?? null,
      })
      .returning()
      .get();

    revalidatePath("/maintenance/dashboard");
    revalidatePath(`/assets/${data.assetId}`);

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create OEE measurement",
    };
  }
}

// ─── Get average OEE per asset ─────────────────────────────────────

export async function getAssetOEEAverage(assetId: number) {
  try {
    await requireGrant({
      capability: "asset.read",
      scope: { dim: null },
      actionName: "getAssetOEEAverage",
    });

    const rows = await db
      .select({
        oeePct: oeeMeasurements.oeePct,
        availabilityPct: oeeMeasurements.availabilityPct,
        performancePct: oeeMeasurements.performancePct,
        qualityPct: oeeMeasurements.qualityPct,
      })
      .from(oeeMeasurements)
      .where(eq(oeeMeasurements.assetId, assetId));

    if (rows.length === 0) {
      return { success: true as const, data: null };
    }

    const avg = (arr: (number | null)[]) => {
      const valid = arr.filter((v): v is number => v !== null);
      return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : 0;
    };

    return {
      success: true as const,
      data: {
        averageOEE: avg(rows.map((r) => r.oeePct)),
        averageAvailability: avg(rows.map((r) => r.availabilityPct)),
        averagePerformance: avg(rows.map((r) => r.performancePct)),
        averageQuality: avg(rows.map((r) => r.qualityPct)),
        measurementCount: rows.length,
      },
    };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch OEE average",
    };
  }
}
