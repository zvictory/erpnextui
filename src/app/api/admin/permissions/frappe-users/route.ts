import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireGrantApi } from "@/lib/permissions/api-guard";
import { getTenant } from "@/lib/config-store";

export async function GET(req: NextRequest) {
  const gate = await requireGrantApi({
    capability: "platform.admin",
    scope: { dim: null },
    actionName: "listFrappeUsers",
  });
  if (!gate.ok) return gate.response;

  const tenantConfig = getTenant(gate.ctx.tenant);
  if (!tenantConfig?.url) {
    return NextResponse.json({ error: "Tenant not configured" }, { status: 400 });
  }
  const siteUrl = tenantConfig.url;

  const url = new URL(req.url);
  const search = url.searchParams.get("q") ?? "";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

  const filters: unknown[][] = [["enabled", "=", 1]];
  if (search) {
    filters.push(["full_name", "like", `%${search}%`]);
  }

  const targetUrl = `${siteUrl}/api/resource/User?filters=${encodeURIComponent(JSON.stringify(filters))}&fields=${encodeURIComponent(JSON.stringify(["name", "email", "full_name", "enabled"]))}&limit_page_length=${limit}`;

  const jar = await cookies();
  const sid = jar.get("sid")?.value;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (sid) headers["Cookie"] = `sid=${sid}`;

  try {
    const resp = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) {
      return NextResponse.json({ error: "Failed to fetch users from Frappe" }, { status: 502 });
    }

    const json = await resp.json();
    const users = (json.data ?? [])
      .filter((u: { email: string }) => u.email && !["Administrator", "Guest"].includes(u.email))
      .map((u: { email: string; full_name: string; enabled: number }) => ({
        email: u.email.toLowerCase(),
        fullName: u.full_name ?? u.email,
        enabled: !!u.enabled,
      }));

    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream unreachable" },
      { status: 502 },
    );
  }
}
