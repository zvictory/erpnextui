"use server";

import { db } from "@/db";
import { productionLines } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createLineSchema, updateLineSchema } from "@/lib/validations";

// ─── Get all lines ──────────────────────────────────────────────────

export async function getLines() {
  try {
    const rows = await db
      .select()
      .from(productionLines)
      .orderBy(asc(productionLines.sortOrder));

    return { success: true as const, data: rows };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch lines",
    };
  }
}

// ─── Create line ────────────────────────────────────────────────────

export async function createLine(data: unknown) {
  try {
    const parsed = createLineSchema.parse(data);

    const result = db
      .insert(productionLines)
      .values({
        name: parsed.name,
        description: parsed.description ?? null,
        sortOrder: parsed.sortOrder ?? null,
      })
      .returning()
      .get();

    revalidatePath("/lines");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create line",
    };
  }
}

// ─── Update line ────────────────────────────────────────────────────

export async function updateLine(id: number, data: unknown) {
  try {
    const parsed = updateLineSchema.parse({ ...(typeof data === 'object' && data !== null ? data : {}), id });

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
      .update(productionLines)
      .set(cleanData)
      .where(eq(productionLines.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Line not found" };
    }

    revalidatePath("/lines");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update line",
    };
  }
}

// ─── Delete line ────────────────────────────────────────────────────

export async function deleteLine(id: number) {
  try {
    const result = db
      .delete(productionLines)
      .where(eq(productionLines.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Line not found" };
    }

    revalidatePath("/lines");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete line",
    };
  }
}
