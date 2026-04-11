"use server";

import { db } from "@/db";
import { energyLogs, productionRuns, products } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createEnergyLogSchema, updateEnergyLogSchema } from "@/lib/validations";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";

// ─── Types ──────────────────────────────────────────────────────────

interface EnergyFilters {
  dateFrom?: string;
  dateTo?: string;
}

// ─── Get energy logs ────────────────────────────────────────────────

export async function getEnergyLogs(filters?: EnergyFilters) {
  try {
    await requireGrant({
      capability: "energy.read",
      scope: { dim: null },
      actionName: "getEnergyLogs",
    });

    const conditions = [];

    if (filters?.dateFrom) {
      conditions.push(gte(energyLogs.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(energyLogs.date, filters.dateTo));
    }

    const rows = await db
      .select()
      .from(energyLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(energyLogs.date));

    // For each date, calculate total production weight from production runs
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const weightResult = await db
          .select({
            totalWeightKg:
              sql<number>`coalesce(sum(${productionRuns.actualOutput} * ${products.weightKg}), 0)`.as(
                "total_weight_kg",
              ),
          })
          .from(productionRuns)
          .leftJoin(products, eq(productionRuns.productId, products.id))
          .where(eq(productionRuns.date, row.date));

        const totalProductionWeightKg = weightResult[0]?.totalWeightKg ?? 0;

        return {
          ...row,
          totalProductionWeightKg,
          electricityPerKg:
            totalProductionWeightKg > 0
              ? (row.electricityKwh ?? 0) / totalProductionWeightKg
              : null,
          gasPerKg: totalProductionWeightKg > 0 ? (row.gasM3 ?? 0) / totalProductionWeightKg : null,
        };
      }),
    );

    return { success: true as const, data: enriched };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch energy logs",
    };
  }
}

// ─── Create energy log ──────────────────────────────────────────────

export async function createEnergyLog(data: unknown) {
  try {
    await requireGrant({
      capability: "energy.write",
      scope: { dim: null },
      actionName: "createEnergyLog",
    });

    const parsed = createEnergyLogSchema.parse(data);

    const result = db
      .insert(energyLogs)
      .values({
        date: parsed.date,
        electricityKwh: parsed.electricityKwh,
        gasM3: parsed.gasM3,
      })
      .returning()
      .get();

    revalidatePath("/energy");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create energy log",
    };
  }
}

// ─── Update energy log ──────────────────────────────────────────────

export async function updateEnergyLog(id: number, data: unknown) {
  try {
    await requireGrant({
      capability: "energy.write",
      scope: { dim: null },
      actionName: "updateEnergyLog",
    });

    const parsed = updateEnergyLogSchema.parse({
      ...(typeof data === "object" && data !== null ? data : {}),
      id,
    });

    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key !== "id" && value !== undefined) {
        cleanData[key] = value;
      }
    }

    if (Object.keys(cleanData).length === 0) {
      return { success: false as const, error: "No fields to update" };
    }

    const result = db
      .update(energyLogs)
      .set(cleanData)
      .where(eq(energyLogs.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Energy log not found" };
    }

    revalidatePath("/energy");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update energy log",
    };
  }
}

// ─── Delete energy log ──────────────────────────────────────────────

export async function deleteEnergyLog(id: number) {
  try {
    await requireGrant({
      capability: "energy.write",
      scope: { dim: null },
      actionName: "deleteEnergyLog",
    });

    const result = db.delete(energyLogs).where(eq(energyLogs.id, id)).returning().get();

    if (!result) {
      return { success: false as const, error: "Energy log not found" };
    }

    revalidatePath("/energy");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete energy log",
    };
  }
}
