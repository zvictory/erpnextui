import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { customCapabilities } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";

const patchSchema = z.object({
  module: z.string().min(1).optional(),
  labelKey: z.string().min(1).optional(),
  scopeDim: z.enum(["line", "warehouse", "company"]).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "updateCustomCapability",
  });
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const tenant = gate.ctx.tenant;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await db
    .select({ id: customCapabilities.id })
    .from(customCapabilities)
    .where(and(eq(customCapabilities.tenant, tenant), eq(customCapabilities.id, id)))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Capability not found" }, { status: 404 });
  }

  const updateSet: Partial<{ module: string; labelKey: string; scopeDim: string | null }> = {};
  if (parsed.data.module !== undefined) updateSet.module = parsed.data.module;
  if (parsed.data.labelKey !== undefined) updateSet.labelKey = parsed.data.labelKey;
  if (parsed.data.scopeDim !== undefined) updateSet.scopeDim = parsed.data.scopeDim;

  if (Object.keys(updateSet).length > 0) {
    await db
      .update(customCapabilities)
      .set(updateSet)
      .where(and(eq(customCapabilities.tenant, tenant), eq(customCapabilities.id, id)));
  }

  return NextResponse.json({ id });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "deleteCustomCapability",
  });
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const tenant = gate.ctx.tenant;

  await db
    .delete(customCapabilities)
    .where(and(eq(customCapabilities.tenant, tenant), eq(customCapabilities.id, id)));

  return NextResponse.json({ id });
}
