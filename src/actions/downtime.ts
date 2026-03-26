"use server";

import { db } from "@/db";
import { downtimeEvents, stopCodes, productionLines } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createDowntimeEventSchema,
  updateDowntimeEventSchema,
} from "@/lib/validations";

// ─── Types ──────────────────────────────────────────────────────────

interface DowntimeFilters {
  dateFrom?: string;
  dateTo?: string;
  lineId?: number;
}

// ─── Get downtime events ────────────────────────────────────────────

export async function getDowntimeEvents(filters?: DowntimeFilters) {
  try {
    const conditions = [];

    if (filters?.dateFrom) {
      conditions.push(gte(downtimeEvents.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(downtimeEvents.date, filters.dateTo));
    }
    if (filters?.lineId) {
      conditions.push(eq(downtimeEvents.lineId, filters.lineId));
    }

    const rows = await db
      .select({
        id: downtimeEvents.id,
        date: downtimeEvents.date,
        lineId: downtimeEvents.lineId,
        stopCodeId: downtimeEvents.stopCodeId,
        durationMinutes: downtimeEvents.durationMinutes,
        notes: downtimeEvents.notes,
        stopCodeCode: stopCodes.code,
        stopCodeName: stopCodes.nameUz,
        stopCodeCategory: stopCodes.category,
        lineName: productionLines.name,
      })
      .from(downtimeEvents)
      .leftJoin(stopCodes, eq(downtimeEvents.stopCodeId, stopCodes.id))
      .leftJoin(
        productionLines,
        eq(downtimeEvents.lineId, productionLines.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(downtimeEvents.date));

    return { success: true as const, data: rows };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch downtime events",
    };
  }
}

// ─── Create downtime event ──────────────────────────────────────────

export async function createDowntimeEvent(data: unknown) {
  try {
    const parsed = createDowntimeEventSchema.parse(data);

    const result = db
      .insert(downtimeEvents)
      .values({
        date: parsed.date,
        lineId: parsed.lineId,
        stopCodeId: parsed.stopCodeId,
        durationMinutes: parsed.durationMinutes,
        notes: parsed.notes ?? null,
      })
      .returning()
      .get();

    revalidatePath("/downtime");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create downtime event",
    };
  }
}

// ─── Update downtime event ──────────────────────────────────────────

export async function updateDowntimeEvent(id: number, data: unknown) {
  try {
    const parsed = updateDowntimeEventSchema.parse({ ...(typeof data === 'object' && data !== null ? data : {}), id });

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
      .update(downtimeEvents)
      .set(cleanData)
      .where(eq(downtimeEvents.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Downtime event not found" };
    }

    revalidatePath("/downtime");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update downtime event",
    };
  }
}

// ─── Delete downtime event ──────────────────────────────────────────

export async function deleteDowntimeEvent(id: number) {
  try {
    const result = db
      .delete(downtimeEvents)
      .where(eq(downtimeEvents.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Downtime event not found" };
    }

    revalidatePath("/downtime");
    revalidatePath("/");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete downtime event",
    };
  }
}

// ─── Pareto data ────────────────────────────────────────────────────

export async function getDowntimeParetoData(filters?: DowntimeFilters) {
  try {
    const conditions = [];

    if (filters?.dateFrom) {
      conditions.push(gte(downtimeEvents.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(downtimeEvents.date, filters.dateTo));
    }
    if (filters?.lineId) {
      conditions.push(eq(downtimeEvents.lineId, filters.lineId));
    }

    const rows = await db
      .select({
        stopCodeId: downtimeEvents.stopCodeId,
        stopCodeCode: stopCodes.code,
        stopCodeName: stopCodes.nameUz,
        stopCodeCategory: stopCodes.category,
        totalMinutes: sql<number>`sum(${downtimeEvents.durationMinutes})`.as(
          "total_minutes"
        ),
      })
      .from(downtimeEvents)
      .leftJoin(stopCodes, eq(downtimeEvents.stopCodeId, stopCodes.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(downtimeEvents.stopCodeId)
      .orderBy(sql`sum(${downtimeEvents.durationMinutes}) desc`);

    // Calculate cumulative percentage
    const grandTotal = rows.reduce((sum, row) => sum + (row.totalMinutes ?? 0), 0);

    let cumulative = 0;
    const enriched = rows.map((row) => {
      cumulative += row.totalMinutes ?? 0;
      const percentage = grandTotal > 0 ? ((row.totalMinutes ?? 0) / grandTotal) * 100 : 0;
      const cumulativePercentage = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;

      return {
        ...row,
        percentage,
        cumulativePercentage,
      };
    });

    return { success: true as const, data: enriched };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch Pareto data",
    };
  }
}
