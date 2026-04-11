import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { customCapabilities } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";

const createSchema = z.object({
  id: z.string().min(1),
  module: z.string().min(1),
  labelKey: z.string().min(1),
  scopeDim: z.enum(["line", "warehouse", "company"]).nullable().optional(),
});

export async function GET() {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "listCustomCapabilities",
  });
  if (!gate.ok) return gate.response;

  const rows = await db
    .select()
    .from(customCapabilities)
    .where(eq(customCapabilities.tenant, gate.ctx.tenant));

  return NextResponse.json({ capabilities: rows });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "createCustomCapability",
  });
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tenant = gate.ctx.tenant;
  const { id, module, labelKey, scopeDim = null } = parsed.data;

  const exists = await db
    .select({ id: customCapabilities.id })
    .from(customCapabilities)
    .where(and(eq(customCapabilities.tenant, tenant), eq(customCapabilities.id, id)))
    .get();

  if (exists) {
    return NextResponse.json({ error: "Capability already exists" }, { status: 409 });
  }

  await db.insert(customCapabilities).values({
    id,
    module,
    labelKey,
    scopeDim,
    tenant,
  });

  return NextResponse.json({ id, module, labelKey, scopeDim }, { status: 201 });
}
