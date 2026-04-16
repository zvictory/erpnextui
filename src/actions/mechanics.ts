"use server";

import { db } from "@/db";
import { mechanics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import type { MechanicFormValues } from "@/types/maintenance";

// ─── List mechanics ────────────────────────────────────────────────

export async function getMechanics() {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getMechanics",
    });

    const rows = await db
      .select()
      .from(mechanics)
      .where(eq(mechanics.active, 1))
      .orderBy(asc(mechanics.employeeName));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch mechanics" };
  }
}

// ─── Get single mechanic ──────────────────────────────────────────

export async function getMechanic(id: number) {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getMechanic",
    });

    const row = db.select().from(mechanics).where(eq(mechanics.id, id)).get();

    if (!row) return { success: false as const, error: "Mechanic not found" };

    return { success: true as const, data: row };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch mechanic" };
  }
}

// ─── Create mechanic ──────────────────────────────────────────────

export async function createMechanic(data: MechanicFormValues) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "createMechanic",
    });

    const result = db
      .insert(mechanics)
      .values({
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        hourlyRate: data.hourlyRate,
        specialization: data.specialization ?? null,
        certifications: data.certifications ? JSON.stringify(data.certifications) : null,
      })
      .returning()
      .get();

    revalidatePath("/maintenance");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to create mechanic" };
  }
}

// ─── Update mechanic ──────────────────────────────────────────────

export async function updateMechanic(id: number, data: Partial<MechanicFormValues>) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "updateMechanic",
    });

    const result = db
      .update(mechanics)
      .set({
        ...(data.employeeName !== undefined && { employeeName: data.employeeName }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.specialization !== undefined && { specialization: data.specialization ?? null }),
        ...(data.certifications !== undefined && {
          certifications: data.certifications ? JSON.stringify(data.certifications) : null,
        }),
      })
      .where(eq(mechanics.id, id))
      .returning()
      .get();

    revalidatePath("/maintenance");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to update mechanic" };
  }
}

// ─── Deactivate mechanic ──────────────────────────────────────────

export async function deactivateMechanic(id: number) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "deactivateMechanic",
    });

    db.update(mechanics).set({ active: 0 }).where(eq(mechanics.id, id)).run();

    revalidatePath("/maintenance");

    return { success: true as const };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to deactivate mechanic" };
  }
}
