"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createProductSchema,
  updateProductSchema,
} from "@/lib/validations";

// ─── Get all products ───────────────────────────────────────────────

export async function getProducts() {
  try {
    const rows = await db
      .select()
      .from(products)
      .orderBy(asc(products.code));

    return { success: true as const, data: rows };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch products",
    };
  }
}

// ─── Create product ─────────────────────────────────────────────────

export async function createProduct(data: unknown) {
  try {
    const parsed = createProductSchema.parse(data);

    const result = db
      .insert(products)
      .values({
        code: parsed.code,
        name: parsed.name,
        unit: parsed.unit ?? null,
        nominalSpeed: parsed.nominalSpeed,
        weightKg: parsed.weightKg ?? null,
        piecesPerBox: parsed.piecesPerBox ?? null,
      })
      .returning()
      .get();

    revalidatePath("/products");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

// ─── Update product ─────────────────────────────────────────────────

export async function updateProduct(id: number, data: unknown) {
  try {
    const parsed = updateProductSchema.parse({ ...(typeof data === 'object' && data !== null ? data : {}), id });

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
      .update(products)
      .set(cleanData)
      .where(eq(products.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Product not found" };
    }

    revalidatePath("/products");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update product",
    };
  }
}

// ─── Delete product ─────────────────────────────────────────────────

export async function deleteProduct(id: number) {
  try {
    const result = db
      .delete(products)
      .where(eq(products.id, id))
      .returning()
      .get();

    if (!result) {
      return { success: false as const, error: "Product not found" };
    }

    revalidatePath("/products");

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete product",
    };
  }
}
