import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { userCapabilities, permissionAudit, roleTemplateItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";
import { invalidateAuthContext } from "@/lib/permissions/resolve-context";

const applySchema = z.object({
  userEmail: z.string().email(),
  templateId: z.string().min(1),
  scopeValues: z.record(z.string(), z.array(z.string())).optional(),
});

export async function POST(req: NextRequest) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "applyRoleTemplate",
  });
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userEmail, templateId, scopeValues = {} } = parsed.data;
  const tenant = gate.ctx.tenant;
  const actor = gate.ctx.user;

  const items = await db
    .select()
    .from(roleTemplateItems)
    .where(eq(roleTemplateItems.templateId, templateId));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Template not found or has no capabilities" },
      { status: 404 },
    );
  }

  const existing = await db
    .select({
      capabilityId: userCapabilities.capabilityId,
      scopeDim: userCapabilities.scopeDim,
      scopeValue: userCapabilities.scopeValue,
    })
    .from(userCapabilities)
    .where(and(eq(userCapabilities.tenant, tenant), eq(userCapabilities.userEmail, userEmail)));

  const existingKeys = new Set(
    existing.map((g) => `${g.capabilityId}::${g.scopeDim}::${g.scopeValue}`),
  );

  const toAdd: Array<{ capabilityId: string; scopeDim: string; scopeValue: string }> = [];
  const skipped: string[] = [];

  for (const item of items) {
    const dim = item.defaultScopeDim === "*" ? "*" : item.defaultScopeDim;
    const values = scopeValues[item.capabilityId] ?? (dim === "*" ? ["*"] : []);
    const scopeValueList = values.length > 0 ? values : dim === "*" ? ["*"] : [];

    for (const scopeValue of scopeValueList) {
      const key = `${item.capabilityId}::${dim}::${scopeValue}`;
      if (existingKeys.has(key)) {
        skipped.push(key);
        continue;
      }
      toAdd.push({ capabilityId: item.capabilityId, scopeDim: dim, scopeValue });
      existingKeys.add(key);
    }
  }

  db.transaction((tx) => {
    for (const g of toAdd) {
      tx.insert(userCapabilities)
        .values({
          tenant,
          userEmail,
          capabilityId: g.capabilityId,
          scopeDim: g.scopeDim,
          scopeValue: g.scopeValue,
          grantedBy: actor,
        })
        .run();
      tx.insert(permissionAudit)
        .values({
          event: "grant",
          tenant,
          userEmail,
          capabilityId: g.capabilityId,
          scopeDim: g.scopeDim,
          scopeValue: g.scopeValue,
          actorEmail: actor,
          details: JSON.stringify({ source: "template", templateId }),
        })
        .run();
    }
  });

  invalidateAuthContext(tenant, userEmail);

  return NextResponse.json({
    userEmail,
    templateId,
    added: toAdd.length,
    skipped: skipped.length,
  });
}
