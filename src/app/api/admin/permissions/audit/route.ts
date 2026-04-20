import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { permissionAudit, permissionAuditDryrun } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireGrantApi } from "@/lib/permissions/api-guard";

export async function GET(req: NextRequest) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "getPermissionAudit",
  });
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const source = url.searchParams.get("source") ?? "enforce";
  const limitRaw = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
  const userFilter = url.searchParams.get("user")?.toLowerCase();

  const tenant = gate.ctx.tenant;

  if (source === "dryrun") {
    const where = userFilter
      ? and(
          eq(permissionAuditDryrun.tenant, tenant),
          eq(permissionAuditDryrun.userEmail, userFilter),
        )
      : eq(permissionAuditDryrun.tenant, tenant);

    const rows = await db
      .select()
      .from(permissionAuditDryrun)
      .where(where)
      .orderBy(desc(permissionAuditDryrun.occurredAt))
      .limit(limit);

    return NextResponse.json({ source: "dryrun", rows });
  }

  const where = userFilter
    ? and(eq(permissionAudit.tenant, tenant), eq(permissionAudit.userEmail, userFilter))
    : eq(permissionAudit.tenant, tenant);

  const rows = await db
    .select()
    .from(permissionAudit)
    .where(where)
    .orderBy(desc(permissionAudit.occurredAt))
    .limit(limit);

  return NextResponse.json({ source: "enforce", rows });
}
