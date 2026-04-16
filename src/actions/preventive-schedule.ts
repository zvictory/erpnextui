"use server";

import { db } from "@/db";
import { preventiveMaintenanceSchedule, assets } from "@/db/schema";
import { eq, desc, and, lte, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";
import type { PreventiveScheduleFormValues } from "@/types/maintenance";
import { addDays, addWeeks, addMonths, addYears, format } from "date-fns";

// ─── List schedule items ───────────────────────────────────────────

export async function getPreventiveSchedule(assetId?: number) {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getPreventiveSchedule",
    });

    const conditions = [eq(preventiveMaintenanceSchedule.active, 1)];
    if (assetId) conditions.push(eq(preventiveMaintenanceSchedule.assetId, assetId));

    const rows = await db
      .select({
        id: preventiveMaintenanceSchedule.id,
        assetId: preventiveMaintenanceSchedule.assetId,
        assetName: assets.name,
        assetCode: assets.assetCode,
        taskName: preventiveMaintenanceSchedule.taskName,
        taskDescription: preventiveMaintenanceSchedule.taskDescription,
        frequencyType: preventiveMaintenanceSchedule.frequencyType,
        frequencyValue: preventiveMaintenanceSchedule.frequencyValue,
        estimatedDurationHours: preventiveMaintenanceSchedule.estimatedDurationHours,
        requiredParts: preventiveMaintenanceSchedule.requiredParts,
        lastPerformed: preventiveMaintenanceSchedule.lastPerformed,
        nextDue: preventiveMaintenanceSchedule.nextDue,
        assignedMechanic: preventiveMaintenanceSchedule.assignedMechanic,
        active: preventiveMaintenanceSchedule.active,
        createdAt: preventiveMaintenanceSchedule.createdAt,
      })
      .from(preventiveMaintenanceSchedule)
      .leftJoin(assets, eq(preventiveMaintenanceSchedule.assetId, assets.id))
      .where(and(...conditions))
      .orderBy(asc(preventiveMaintenanceSchedule.nextDue));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch schedule",
    };
  }
}

// ─── Get overdue tasks ─────────────────────────────────────────────

export async function getOverdueTasks() {
  try {
    await requireGrant({
      capability: "maintenance.read",
      scope: { dim: null },
      actionName: "getOverdueTasks",
    });

    const today = format(new Date(), "yyyy-MM-dd");

    const rows = await db
      .select({
        id: preventiveMaintenanceSchedule.id,
        assetId: preventiveMaintenanceSchedule.assetId,
        assetName: assets.name,
        assetCode: assets.assetCode,
        taskName: preventiveMaintenanceSchedule.taskName,
        nextDue: preventiveMaintenanceSchedule.nextDue,
        assignedMechanic: preventiveMaintenanceSchedule.assignedMechanic,
      })
      .from(preventiveMaintenanceSchedule)
      .leftJoin(assets, eq(preventiveMaintenanceSchedule.assetId, assets.id))
      .where(
        and(
          eq(preventiveMaintenanceSchedule.active, 1),
          lte(preventiveMaintenanceSchedule.nextDue, today),
        ),
      )
      .orderBy(asc(preventiveMaintenanceSchedule.nextDue));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch overdue tasks",
    };
  }
}

// ─── Create schedule entry ─────────────────────────────────────────

export async function createPreventiveSchedule(data: PreventiveScheduleFormValues) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "createPreventiveSchedule",
    });

    const result = db
      .insert(preventiveMaintenanceSchedule)
      .values({
        assetId: data.assetId,
        taskName: data.taskName,
        taskDescription: data.taskDescription ?? null,
        frequencyType: data.frequencyType,
        frequencyValue: data.frequencyValue,
        estimatedDurationHours: data.estimatedDurationHours ?? null,
        requiredParts: data.requiredParts ? JSON.stringify(data.requiredParts) : null,
        nextDue: data.nextDue,
        assignedMechanic: data.assignedMechanic ?? null,
      })
      .returning()
      .get();

    revalidatePath("/maintenance/schedule");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create schedule",
    };
  }
}

// ─── Mark task as completed (advances next_due) ────────────────────

export async function completePreventiveTask(id: number) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "completePreventiveTask",
    });

    const task = db
      .select()
      .from(preventiveMaintenanceSchedule)
      .where(eq(preventiveMaintenanceSchedule.id, id))
      .get();

    if (!task) return { success: false as const, error: "Task not found" };

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    // Calculate next due based on frequency
    let nextDue: Date;
    switch (task.frequencyType) {
      case "days":
        nextDue = addDays(today, task.frequencyValue);
        break;
      case "weeks":
        nextDue = addWeeks(today, task.frequencyValue);
        break;
      case "months":
        nextDue = addMonths(today, task.frequencyValue);
        break;
      case "years":
        nextDue = addYears(today, task.frequencyValue);
        break;
      default:
        nextDue = addDays(today, task.frequencyValue);
        break;
    }

    db.update(preventiveMaintenanceSchedule)
      .set({
        lastPerformed: todayStr,
        nextDue: format(nextDue, "yyyy-MM-dd"),
      })
      .where(eq(preventiveMaintenanceSchedule.id, id))
      .run();

    revalidatePath("/maintenance/schedule");

    return { success: true as const, data: { lastPerformed: todayStr, nextDue: format(nextDue, "yyyy-MM-dd") } };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to complete task",
    };
  }
}

// ─── Update schedule entry ─────────────────────────────────────────

export async function updatePreventiveSchedule(
  id: number,
  data: Partial<PreventiveScheduleFormValues>,
) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "updatePreventiveSchedule",
    });

    const result = db
      .update(preventiveMaintenanceSchedule)
      .set({
        ...(data.taskName !== undefined && { taskName: data.taskName }),
        ...(data.taskDescription !== undefined && {
          taskDescription: data.taskDescription ?? null,
        }),
        ...(data.frequencyType !== undefined && { frequencyType: data.frequencyType }),
        ...(data.frequencyValue !== undefined && { frequencyValue: data.frequencyValue }),
        ...(data.estimatedDurationHours !== undefined && {
          estimatedDurationHours: data.estimatedDurationHours ?? null,
        }),
        ...(data.requiredParts !== undefined && {
          requiredParts: data.requiredParts ? JSON.stringify(data.requiredParts) : null,
        }),
        ...(data.nextDue !== undefined && { nextDue: data.nextDue }),
        ...(data.assignedMechanic !== undefined && {
          assignedMechanic: data.assignedMechanic ?? null,
        }),
      })
      .where(eq(preventiveMaintenanceSchedule.id, id))
      .returning()
      .get();

    revalidatePath("/maintenance/schedule");

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update schedule",
    };
  }
}

// ─── Delete schedule entry ─────────────────────────────────────────

export async function deletePreventiveSchedule(id: number) {
  try {
    await requireGrant({
      capability: "maintenance.write",
      scope: { dim: null },
      actionName: "deletePreventiveSchedule",
    });

    db.update(preventiveMaintenanceSchedule)
      .set({ active: 0 })
      .where(eq(preventiveMaintenanceSchedule.id, id))
      .run();

    revalidatePath("/maintenance/schedule");

    return { success: true as const };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete schedule",
    };
  }
}
