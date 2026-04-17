"use server";

import { db } from "@/db";
import { workOrderAssets, assets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkOrderAsset(workOrder: string) {
  const rows = await db
    .select({
      id: workOrderAssets.id,
      workOrder: workOrderAssets.workOrder,
      assetId: workOrderAssets.assetId,
      notes: workOrderAssets.notes,
      createdAt: workOrderAssets.createdAt,
      // joined asset fields
      assetCode: assets.assetCode,
      assetName: assets.name,
      location: assets.location,
      powerKw: assets.powerKw,
      status: assets.status,
      category: assets.category,
    })
    .from(workOrderAssets)
    .leftJoin(assets, eq(workOrderAssets.assetId, assets.id))
    .where(eq(workOrderAssets.workOrder, workOrder))
    .limit(1);

  return rows[0] ?? null;
}

export async function saveWorkOrderAsset(workOrder: string, assetId: number) {
  // Upsert: delete existing then insert
  await db.delete(workOrderAssets).where(eq(workOrderAssets.workOrder, workOrder));
  const [row] = await db
    .insert(workOrderAssets)
    .values({ workOrder, assetId })
    .returning();
  return row;
}

export async function deleteWorkOrderAsset(workOrder: string) {
  await db.delete(workOrderAssets).where(eq(workOrderAssets.workOrder, workOrder));
}

export async function getAllAssets(search?: string) {
  const { like, or } = await import("drizzle-orm");
  const conditions = search
    ? or(
        like(assets.name, `%${search}%`),
        like(assets.assetCode, `%${search}%`),
        like(assets.category, `%${search}%`),
      )
    : undefined;

  return db.select().from(assets).where(conditions).orderBy(assets.assetCode);
}
