"use server";

import { db } from "@/db";
import { spareParts } from "@/db/schema";
import { eq, asc, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import type { SparePartFormValues } from "@/types/maintenance";

// ─── List spare parts ──────────────────────────────────────────────

export async function getSpareParts() {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getSpareParts",
    });

    const rows = await db
      .select()
      .from(spareParts)
      .where(eq(spareParts.active, 1))
      .orderBy(asc(spareParts.name));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch spare parts",
    };
  }
}

// ─── Get low-stock parts ───────────────────────────────────────────

export async function getLowStockParts() {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getLowStockParts",
    });

    const rows = await db
      .select()
      .from(spareParts)
      .where(eq(spareParts.active, 1))
      .orderBy(asc(spareParts.name));

    // Filter in JS because SQLite doesn't support column-to-column comparison well with Drizzle
    const lowStock = rows.filter(
      (p) =>
        p.currentStock !== null &&
        p.minStock !== null &&
        p.currentStock < p.minStock,
    );

    return { success: true as const, data: lowStock };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch low-stock parts",
    };
  }
}

// ─── Create spare part ─────────────────────────────────────────────

export async function createSparePart(data: SparePartFormValues) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "createSparePart",
    });

    const result = db
      .insert(spareParts)
      .values({
        partCode: data.partCode,
        name: data.name,
        category: data.category ?? null,
        compatibleAssets: data.compatibleAssets ? JSON.stringify(data.compatibleAssets) : null,
        currentStock: 0,
        minStock: data.minStock ?? 0,
        reorderQty: data.reorderQty ?? null,
        lastPurchasePrice: data.lastPurchasePrice ?? null,
        preferredSupplier: data.preferredSupplier ?? null,
        storageLocation: data.storageLocation ?? null,
      })
      .returning()
      .get();

    revalidatePath("/maintenance/spare-parts");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create spare part",
    };
  }
}

// ─── Update spare part ─────────────────────────────────────────────

export async function updateSparePart(id: number, data: Partial<SparePartFormValues>) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "updateSparePart",
    });

    const result = db
      .update(spareParts)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category ?? null }),
        ...(data.compatibleAssets !== undefined && {
          compatibleAssets: data.compatibleAssets ? JSON.stringify(data.compatibleAssets) : null,
        }),
        ...(data.minStock !== undefined && { minStock: data.minStock ?? 0 }),
        ...(data.reorderQty !== undefined && { reorderQty: data.reorderQty ?? null }),
        ...(data.lastPurchasePrice !== undefined && {
          lastPurchasePrice: data.lastPurchasePrice ?? null,
        }),
        ...(data.preferredSupplier !== undefined && {
          preferredSupplier: data.preferredSupplier ?? null,
        }),
        ...(data.storageLocation !== undefined && {
          storageLocation: data.storageLocation ?? null,
        }),
      })
      .where(eq(spareParts.id, id))
      .returning()
      .get();

    revalidatePath("/maintenance/spare-parts");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update spare part",
    };
  }
}

// ─── Adjust stock (manual) ─────────────────────────────────────────

export async function adjustSparePartStock(id: number, qty: number) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "adjustSparePartStock",
    });

    const result = db
      .update(spareParts)
      .set({ currentStock: qty })
      .where(eq(spareParts.id, id))
      .returning()
      .get();

    revalidatePath("/maintenance/spare-parts");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to adjust stock",
    };
  }
}
