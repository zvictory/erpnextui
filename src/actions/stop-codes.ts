"use server";

import { db } from "@/db";
import { stopCodes } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";

// ─── Get all stop codes ─────────────────────────────────────────────

export async function getStopCodes() {
  try {
    await requireGrant({
      capability: "downtime.read",
      scope: { dim: "line", mode: "filter" },
      actionName: "getStopCodes",
    });

    const rows = await db.select().from(stopCodes).orderBy(asc(stopCodes.code));

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch stop codes",
    };
  }
}
