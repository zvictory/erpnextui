import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { roleTemplates, roleTemplateItems } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";

const itemSchema = z.object({
  capabilityId: z.string().min(1),
  defaultScopeDim: z.string().min(1),
});

const createBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  items: z.array(itemSchema),
});

export async function GET() {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "listRoleTemplates",
  });
  if (!gate.ok) return gate.response;

  const tenant = gate.ctx.tenant;

  const templates = await db.select().from(roleTemplates).where(eq(roleTemplates.tenant, tenant));

  if (templates.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  const items = await db
    .select()
    .from(roleTemplateItems)
    .where(
      inArray(
        roleTemplateItems.templateId,
        templates.map((t) => t.id),
      ),
    );

  const byTemplate = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = byTemplate.get(item.templateId) ?? [];
    bucket.push(item);
    byTemplate.set(item.templateId, bucket);
  }

  return NextResponse.json({
    templates: templates.map((t) => ({
      ...t,
      items: byTemplate.get(t.id) ?? [],
    })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "createRoleTemplate",
  });
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tenant = gate.ctx.tenant;

  const exists = await db
    .select({ id: roleTemplates.id })
    .from(roleTemplates)
    .where(and(eq(roleTemplates.tenant, tenant), eq(roleTemplates.id, parsed.data.id)))
    .get();

  if (exists) {
    return NextResponse.json({ error: "Template already exists" }, { status: 409 });
  }

  db.transaction((tx) => {
    tx.insert(roleTemplates)
      .values({
        id: parsed.data.id,
        tenant,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .run();
    for (const item of parsed.data.items) {
      tx.insert(roleTemplateItems)
        .values({
          templateId: parsed.data.id,
          capabilityId: item.capabilityId,
          defaultScopeDim: item.defaultScopeDim,
        })
        .run();
    }
  });

  return NextResponse.json({ id: parsed.data.id, itemsCount: parsed.data.items.length });
}
