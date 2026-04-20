"use server";

import { db } from "@/db";
import { productionRuns, products, productionLines } from "@/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createProductionRunSchema, updateProductionRunSchema } from "@/lib/validations";
import { calculateRunMetrics } from "@/lib/calculations";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import { SCOPE_WILDCARD } from "@/lib/permissions/constants";

// ─── Types ──────────────────────────────────────────────────────────

interface ProductionRunFilters {
  dateFrom?: string;
  dateTo?: string;
  lineId?: number;
}

// ─── Get production runs ────────────────────────────────────────────

export async function getProductionRuns(filters?: ProductionRunFilters) {
  try {
    const ctx = await requireGrant({
      capability: "production.read",
      scope: { dim: "line", mode: "filter" },
      actionName: "getProductionRuns",
    });

    const conditions = [];

    if (filters?.dateFrom) {
      conditions.push(gte(productionRuns.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(productionRuns.date, filters.dateTo));
    }
    if (filters?.lineId) {
      conditions.push(eq(productionRuns.lineId, filters.lineId));
    }

    // Enforce line-scope filter unless user has wildcard or is superuser.
    const allowedLines = ctx.allowedScopes.line;
    const hasWildcardLine = ctx.isSuperuser || !allowedLines || allowedLines.has(SCOPE_WILDCARD);

    if (!hasWildcardLine) {
      const allowedLineIds = [...allowedLines].map(Number).filter((n) => !Number.isNaN(n));
      if (allowedLineIds.length === 0) {
        return { success: true as const, data: [] };
      }
      conditions.push(inArray(productionRuns.lineId, allowedLineIds));
    }

    const rows = await db
      .select({
        id: productionRuns.id,
        date: productionRuns.date,
        shift: productionRuns.shift,
        lineId: productionRuns.lineId,
        productId: productionRuns.productId,
        actualOutput: productionRuns.actualOutput,
        totalHours: productionRuns.totalHours,
        plannedStopHours: productionRuns.plannedStopHours,
        createdAt: productionRuns.createdAt,
        productCode: products.code,
        productName: products.name,
        nominalSpeed: products.nominalSpeed,
        productWeightKg: products.weightKg,
        lineName: productionLines.name,
      })
      .from(productionRuns)
      .leftJoin(products, eq(productionRuns.productId, products.id))
      .leftJoin(productionLines, eq(productionRuns.lineId, productionLines.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(productionRuns.date));

    const enriched = rows.map((row) => {
      const metrics = calculateRunMetrics({
        actualOutput: row.actualOutput,
        totalHours: row.totalHours,
        plannedStopHours: row.plannedStopHours ?? 0,
        nominalSpeed: row.nominalSpeed ?? 0,
      });

      return { ...row, ...metrics };
    });

    return { success: true as const, data: enriched };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch production runs",
    };
  }
}

// ─── Get single production run ──────────────────────────────────────

export async function getProductionRun(id: number) {
  try {
    const ctx = await requireGrant({
      capability: "production.read",
      scope: { dim: "line", mode: "filter" },
      actionName: "getProductionRun",
    });

    const rows = await db
      .select({
        id: productionRuns.id,
        date: productionRuns.date,
        shift: productionRuns.shift,
        lineId: productionRuns.lineId,
        productId: productionRuns.productId,
        actualOutput: productionRuns.actualOutput,
        totalHours: productionRuns.totalHours,
        plannedStopHours: productionRuns.plannedStopHours,
        createdAt: productionRuns.createdAt,
        productCode: products.code,
        productName: products.name,
        nominalSpeed: products.nominalSpeed,
        productWeightKg: products.weightKg,
        lineName: productionLines.name,
      })
      .from(productionRuns)
      .leftJoin(products, eq(productionRuns.productId, products.id))
      .leftJoin(productionLines, eq(productionRuns.lineId, productionLines.id))
      .where(eq(productionRuns.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false as const, error: "Production run not found" };
    }

    const row = rows[0];

    // Verify the row's lineId is in the caller's allowed scope.
    const allowedLines = ctx.allowedScopes.line;
    const hasWildcardLine = ctx.isSuperuser || !allowedLines || allowedLines.has(SCOPE_WILDCARD);
    if (!hasWildcardLine && !allowedLines.has(String(row.lineId))) {
      return { success: false as const, error: "Production run not found" };
    }

    const metrics = calculateRunMetrics({
      actualOutput: row.actualOutput,
      totalHours: row.totalHours,
      plannedStopHours: row.plannedStopHours ?? 0,
      nominalSpeed: row.nominalSpeed ?? 0,
    });

    return { success: true as const, data: { ...row, ...metrics } };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch production run",
    };
  }
}

// ─── Create production run ──────────────────────────────────────────

export async function createProductionRun(data: unknown) {
  try {
    const parsed = createProductionRunSchema.parse(data);

    await requireGrant({
      capability: "production.create",
      scope: { dim: "line", mode: "require", value: String(parsed.lineId) },
      actionName: "createProductionRun",
    });

    const result = db
      .insert(productionRuns)
      .values({
        date: parsed.date,
        shift: parsed.shift ?? null,
        lineId: parsed.lineId,
        productId: parsed.productId,
        actualOutput: parsed.actualOutput,
        totalHours: parsed.totalHours,
        plannedStopHours: parsed.plannedStopHours,
      })
      .returning()
      .get();

    revalidatePath("/production");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create production run",
    };
  }
}

// ─── Update production run ──────────────────────────────────────────

export async function updateProductionRun(id: number, data: unknown) {
  try {
    // Fetch existing row first to know the lineId for the scope check.
    const existing = db
      .select({ lineId: productionRuns.lineId })
      .from(productionRuns)
      .where(eq(productionRuns.id, id))
      .get();

    if (!existing) {
      return { success: false as const, error: "Production run not found" };
    }

    await requireGrant({
      capability: "production.update",
      scope: { dim: "line", mode: "require", value: String(existing.lineId) },
      actionName: "updateProductionRun",
    });

    const parsed = updateProductionRunSchema.parse({
      ...(typeof data === "object" && data !== null ? data : {}),
      id,
    });

    // Remove id and undefined fields
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
      .update(productionRuns)
      .set(cleanData)
      .where(eq(productionRuns.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Production run not found" };
    }

    revalidatePath("/production");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update production run",
    };
  }
}

// ─── Delete production run ──────────────────────────────────────────

export async function deleteProductionRun(id: number) {
  try {
    const existing = db
      .select({ lineId: productionRuns.lineId })
      .from(productionRuns)
      .where(eq(productionRuns.id, id))
      .get();

    if (!existing) {
      return { success: false as const, error: "Production run not found" };
    }

    await requireGrant({
      capability: "production.submit",
      scope: { dim: "line", mode: "require", value: String(existing.lineId) },
      actionName: "deleteProductionRun",
    });

    const result = db.delete(productionRuns).where(eq(productionRuns.id, id)).returning().get();

    if (!result) {
      return { success: false as const, error: "Production run not found" };
    }

    revalidatePath("/production");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete production run",
    };
  }
}
