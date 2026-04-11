import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { roleTemplates, roleTemplateItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";

const itemSchema = z.object({
  capabilityId: z.string().min(1),
  defaultScopeDim: z.string().min(1),
});

const patchBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  items: z.array(itemSchema).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "updateRoleTemplate",
  });
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const tenant = gate.ctx.tenant;

  const body = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await db
    .select({ id: roleTemplates.id })
    .from(roleTemplates)
    .where(and(eq(roleTemplates.tenant, tenant), eq(roleTemplates.id, id)))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  db.transaction((tx) => {
    const updateSet: Partial<{ name: string; description: string | null }> = {};
    if (parsed.data.name !== undefined) updateSet.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateSet.description = parsed.data.description;

    if (Object.keys(updateSet).length > 0) {
      tx.update(roleTemplates)
        .set(updateSet)
        .where(and(eq(roleTemplates.tenant, tenant), eq(roleTemplates.id, id)))
        .run();
    }

    if (parsed.data.items !== undefined) {
      tx.delete(roleTemplateItems).where(eq(roleTemplateItems.templateId, id)).run();
      for (const item of parsed.data.items) {
        tx.insert(roleTemplateItems)
          .values({
            templateId: id,
            capabilityId: item.capabilityId,
            defaultScopeDim: item.defaultScopeDim,
          })
          .run();
      }
    }
  });

  return NextResponse.json({ id });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "deleteRoleTemplate",
  });
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const tenant = gate.ctx.tenant;

  const result = await db
    .delete(roleTemplates)
    .where(and(eq(roleTemplates.tenant, tenant), eq(roleTemplates.id, id)))
    .run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ id });
}
