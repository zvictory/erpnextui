"use server";

import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import type { AssetFormValues } from "@/types/asset";

// ─── List assets ───────────────────────────────────────────────────

export async function getAssets(search?: string) {
  try {
    await requireGrant({
      capability: "asset.read",
      scope: { dim: null },
      actionName: "getAssets",
    });

    const conditions = search
      ? or(
          like(assets.name, `%${search}%`),
          like(assets.assetCode, `%${search}%`),
          like(assets.category, `%${search}%`),
        )
      : undefined;

    const rows = await db.select().from(assets).where(conditions).orderBy(desc(assets.id));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch assets",
    };
  }
}

// ─── Get single asset ──────────────────────────────────────────────

export async function getAsset(id: number) {
  try {
    await requireGrant({
      capability: "asset.read",
      scope: { dim: null },
      actionName: "getAsset",
    });

    const row = db.select().from(assets).where(eq(assets.id, id)).get();

    if (!row) {
      return { success: false as const, error: "Asset not found" };
    }

    return { success: true as const, data: row };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch asset",
    };
  }
}

// ─── Create asset ──────────────────────────────────────────────────

export async function createAsset(data: AssetFormValues) {
  try {
    await requireGrant({
      capability: "asset.write",
      scope: { dim: null },
      actionName: "createAsset",
    });

    // Auto-generate asset code
    const lastAsset = db
      .select({ assetCode: assets.assetCode })
      .from(assets)
      .orderBy(desc(assets.id))
      .limit(1)
      .get();

    const nextNum = lastAsset ? parseInt(lastAsset.assetCode.replace("AST-", ""), 10) + 1 : 1;
    const assetCode = `AST-${String(nextNum).padStart(3, "0")}`;

    const result = db
      .insert(assets)
      .values({
        assetCode,
        name: data.name,
        model: data.model ?? null,
        serialNumber: data.serialNumber ?? null,
        category: data.category ?? null,
        purchaseDate: data.purchaseDate,
        supplier: data.supplier ?? null,
        purchaseCost: data.purchaseCost,
        location: data.location ?? null,
        workstation: data.workstation ?? null,
        powerKw: data.powerKw ?? null,
        capacity: data.capacity ?? null,
        technicalSpecs: data.technicalSpecs ?? null,
        usefulLifeYears: data.usefulLifeYears,
        salvageValue: data.salvageValue ?? 0,
        depreciationMethod: data.depreciationMethod,
        warrantyUntil: data.warrantyUntil ?? null,
        status: data.status,
        notes: data.notes ?? null,
        photoUrl: data.photoUrl ?? null,
      })
      .returning()
      .get();

    revalidatePath("/assets");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create asset",
    };
  }
}

// ─── Update asset ──────────────────────────────────────────────────

export async function updateAsset(id: number, data: Partial<AssetFormValues>) {
  try {
    await requireGrant({
      capability: "asset.write",
      scope: { dim: null },
      actionName: "updateAsset",
    });

    const result = db
      .update(assets)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.model !== undefined && { model: data.model ?? null }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber ?? null }),
        ...(data.category !== undefined && { category: data.category ?? null }),
        ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate }),
        ...(data.supplier !== undefined && { supplier: data.supplier ?? null }),
        ...(data.purchaseCost !== undefined && { purchaseCost: data.purchaseCost }),
        ...(data.location !== undefined && { location: data.location ?? null }),
        ...(data.workstation !== undefined && { workstation: data.workstation ?? null }),
        ...(data.powerKw !== undefined && { powerKw: data.powerKw ?? null }),
        ...(data.capacity !== undefined && { capacity: data.capacity ?? null }),
        ...(data.technicalSpecs !== undefined && { technicalSpecs: data.technicalSpecs ?? null }),
        ...(data.usefulLifeYears !== undefined && { usefulLifeYears: data.usefulLifeYears }),
        ...(data.salvageValue !== undefined && { salvageValue: data.salvageValue ?? 0 }),
        ...(data.depreciationMethod !== undefined && {
          depreciationMethod: data.depreciationMethod,
        }),
        ...(data.warrantyUntil !== undefined && { warrantyUntil: data.warrantyUntil ?? null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl ?? null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assets.id, id))
      .returning()
      .get();

    revalidatePath("/assets");
    revalidatePath(`/assets/${id}`);

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update asset",
    };
  }
}

// ─── Delete asset ──────────────────────────────────────────────────

export async function deleteAsset(id: number) {
  try {
    await requireGrant({
      capability: "asset.write",
      scope: { dim: null },
      actionName: "deleteAsset",
    });

    db.delete(assets).where(eq(assets.id, id)).run();

    revalidatePath("/assets");

    return { success: true as const };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete asset",
    };
  }
}
