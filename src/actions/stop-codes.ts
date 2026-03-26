"use server";

import { db } from "@/db";
import { stopCodes } from "@/db/schema";
import { asc } from "drizzle-orm";

// ─── Get all stop codes ─────────────────────────────────────────────

export async function getStopCodes() {
  try {
    const rows = await db
      .select()
      .from(stopCodes)
      .orderBy(asc(stopCodes.code));

    return { success: true as const, data: rows };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch stop codes",
    };
  }
}
