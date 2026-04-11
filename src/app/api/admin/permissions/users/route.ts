import { NextResponse } from "next/server";
import { db } from "@/db";
import { userCapabilities } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";

export type AdminUserRow = {
  userEmail: string;
  grantCount: number;
  lastGrantedAt: string | null;
};

/**
 * GET /api/admin/permissions/users
 *
 * Returns all distinct users that currently hold grants in this tenant along
 * with their grant count. Tenant-owned users that have zero grants will not
 * appear here — the admin UI is expected to union this with the tenant user
 * list (from /api/admin/registrations) to show everyone.
 */
export async function GET() {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "listPermissionUsers",
  });
  if (!gate.ok) return gate.response;

  const rows = await db
    .select({
      userEmail: userCapabilities.userEmail,
      grantCount: sql<number>`COUNT(*)`,
      lastGrantedAt: sql<string | null>`MAX(${userCapabilities.grantedAt})`,
    })
    .from(userCapabilities)
    .where(eq(userCapabilities.tenant, gate.ctx.tenant))
    .groupBy(userCapabilities.userEmail);

  return NextResponse.json({ users: rows satisfies AdminUserRow[] });
}
