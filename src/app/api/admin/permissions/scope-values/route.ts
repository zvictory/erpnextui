import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { productionLines } from "@/db/schema";
import { requireGrantApi } from "@/lib/permissions/api-guard";
import { getTenant } from "@/lib/config-store";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "getScopeValues",
  });
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const dim = url.searchParams.get("dim");
  if (!dim) {
    return NextResponse.json({ error: "Missing dim parameter" }, { status: 400 });
  }

  const tenantConfig = getTenant(gate.ctx.tenant);

  if (dim === "line") {
    const lines = await db
      .select({ id: productionLines.id, name: productionLines.name })
      .from(productionLines)
      .orderBy(productionLines.sortOrder);
    return NextResponse.json({
      dim: "line",
      values: lines.map((l) => ({ value: String(l.id), label: l.name })),
    });
  }

  if (dim === "warehouse" || dim === "company") {
    if (!tenantConfig?.url) {
      return NextResponse.json({ error: "Tenant not configured" }, { status: 400 });
    }
    const frappeDim = dim === "warehouse" ? "Warehouse" : "Company";
    const fields = dim === "warehouse" ? ["name", "warehouse_name"] : ["name", "company_name"];

    const jar = await cookies();
    const sid = jar.get("sid")?.value;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (sid) headers["Cookie"] = `sid=${sid}`;

    const targetUrl = `${tenantConfig.url}/api/resource/${frappeDim}?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=200`;

    try {
      const resp = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(10_000) });
      if (!resp.ok) {
        return NextResponse.json({ error: "Failed to fetch from Frappe" }, { status: 502 });
      }
      const json = await resp.json();
      const data = (json.data ?? []).map((item: Record<string, string>) => ({
        value: item.name,
        label: item.warehouse_name ?? item.company_name ?? item.name,
      }));
      return NextResponse.json({ dim, values: data });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Upstream unreachable" },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ error: `Unknown dimension: ${dim}` }, { status: 400 });
}
