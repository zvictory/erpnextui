import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { userCapabilities, permissionAudit } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";
import { invalidateAuthContext } from "@/lib/permissions/resolve-context";

const grantSchema = z.object({
  capabilityId: z.string().min(1),
  scopeDim: z.string().min(1),
  scopeValue: z.string().min(1),
});

const patchBodySchema = z.object({
  grants: z.array(grantSchema),
});

type Ctx = { params: Promise<{ email: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "getUserGrants",
  });
  if (!gate.ok) return gate.response;

  const { email } = await params;
  const userEmail = decodeURIComponent(email).toLowerCase();

  const rows = await db
    .select({
      capabilityId: userCapabilities.capabilityId,
      scopeDim: userCapabilities.scopeDim,
      scopeValue: userCapabilities.scopeValue,
      grantedBy: userCapabilities.grantedBy,
      grantedAt: userCapabilities.grantedAt,
    })
    .from(userCapabilities)
    .where(
      and(
        eq(userCapabilities.tenant, gate.ctx.tenant),
        eq(userCapabilities.userEmail, userEmail),
      ),
    );

  return NextResponse.json({ userEmail, grants: rows });
}

/**
 * Replace all grants for a user in this tenant with the given list. The
 * admin UI loads the current grant set, mutates it client-side, then
 * PATCHes the whole set back — simple and atomic. Removed grants get
 * audit log rows with event="revoke"; added grants get event="grant".
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "updateUserGrants",
  });
  if (!gate.ok) return gate.response;

  const { email } = await params;
  const userEmail = decodeURIComponent(email).toLowerCase();

  const body = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tenant = gate.ctx.tenant;
  const actor = gate.ctx.user;

  const existing = await db
    .select({
      capabilityId: userCapabilities.capabilityId,
      scopeDim: userCapabilities.scopeDim,
      scopeValue: userCapabilities.scopeValue,
    })
    .from(userCapabilities)
    .where(and(eq(userCapabilities.tenant, tenant), eq(userCapabilities.userEmail, userEmail)));

  const keyOf = (g: { capabilityId: string; scopeDim: string; scopeValue: string }) =>
    `${g.capabilityId}::${g.scopeDim}::${g.scopeValue}`;
  const existingKeys = new Set(existing.map(keyOf));
  const desiredKeys = new Set(parsed.data.grants.map(keyOf));

  const toAdd = parsed.data.grants.filter((g) => !existingKeys.has(keyOf(g)));
  const toRemove = existing.filter((g) => !desiredKeys.has(keyOf(g)));

  db.transaction((tx) => {
    for (const g of toRemove) {
      tx.delete(userCapabilities)
        .where(
          and(
            eq(userCapabilities.tenant, tenant),
            eq(userCapabilities.userEmail, userEmail),
            eq(userCapabilities.capabilityId, g.capabilityId),
            eq(userCapabilities.scopeDim, g.scopeDim),
            eq(userCapabilities.scopeValue, g.scopeValue),
          ),
        )
        .run();
      tx.insert(permissionAudit)
        .values({
          event: "revoke",
          tenant,
          userEmail,
          capabilityId: g.capabilityId,
          scopeDim: g.scopeDim,
          scopeValue: g.scopeValue,
          actorEmail: actor,
        })
        .run();
    }
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
        })
        .run();
    }
  });

  invalidateAuthContext(tenant, userEmail);

  return NextResponse.json({
    userEmail,
    added: toAdd.length,
    removed: toRemove.length,
  });
}
