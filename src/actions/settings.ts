"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { updateSettingSchema } from "@/lib/validations";

// ─── Get all settings ───────────────────────────────────────────────

export async function getSettings() {
  try {
    const rows = await db.select().from(settings);

    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value ?? "";
    }

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch settings",
    };
  }
}

// ─── Get single setting ────────────────────────────────────────────

export async function getSetting(key: string) {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (rows.length === 0) {
      return { success: true as const, data: null };
    }

    return { success: true as const, data: rows[0].value };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch setting",
    };
  }
}

// ─── Update single setting ──────────────────────────────────────────

export async function updateSetting(key: string, value: string) {
  try {
    updateSettingSchema.parse({ key, value });

    // Upsert: insert or update on conflict
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();

    revalidatePath("/settings");

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update setting",
    };
  }
}

// ─── Update multiple settings ───────────────────────────────────────

export async function updateSettings(newSettings: Record<string, string>) {
  try {
    for (const [key, value] of Object.entries(newSettings)) {
      updateSettingSchema.parse({ key, value });

      db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
    }

    revalidatePath("/settings");

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}
