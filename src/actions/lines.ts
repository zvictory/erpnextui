"use server";

import { db } from "@/db";
import { productionLines } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createLineSchema, updateLineSchema } from "@/lib/validations";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import { SCOPE_WILDCARD } from "@/lib/permissions/constants";

// ─── Get all lines ──────────────────────────────────────────────────

export async function getLines() {
  try {
    const ctx = await requireGrant({
      capability: "production.read",
      scope: { dim: "line", mode: "filter" },
      actionName: "getLines",
    });

    const query = db.select().from(productionLines).orderBy(asc(productionLines.sortOrder));

    // Filter by the user's allowed line scopes unless they have wildcard.
    const allowed = ctx.allowedScopes.line;
    const hasWildcard = !allowed || allowed.has(SCOPE_WILDCARD) || ctx.isSuperuser;

    const rows = hasWildcard
      ? await query
      : await db
          .select()
          .from(productionLines)
          .where(inArray(productionLines.id, [...allowed].map(Number).filter((n) => !Number.isNaN(n))))
          .orderBy(asc(productionLines.sortOrder));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch lines",
    };
  }
}

// ─── Create line ────────────────────────────────────────────────────

export async function createLine(data: unknown) {
  try {
    await requireGrant({
      capability: "lines.manage",
      scope: { dim: null },
      actionName: "createLine",
    });

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
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create line",
    };
  }
}

// ─── Update line ────────────────────────────────────────────────────

export async function updateLine(id: number, data: unknown) {
  try {
    await requireGrant({
      capability: "lines.manage",
      scope: { dim: "line", mode: "require", value: String(id) },
      actionName: "updateLine",
    });

    const parsed = updateLineSchema.parse({
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
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update line",
    };
  }
}

// ─── Delete line ────────────────────────────────────────────────────

export async function deleteLine(id: number) {
  try {
    await requireGrant({
      capability: "lines.manage",
      scope: { dim: "line", mode: "require", value: String(id) },
      actionName: "deleteLine",
    });

    const result = db.delete(productionLines).where(eq(productionLines.id, id)).returning().get();

    if (!result) {
      return { success: false as const, error: "Line not found" };
    }

    revalidatePath("/lines");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete line",
    };
  }
}

