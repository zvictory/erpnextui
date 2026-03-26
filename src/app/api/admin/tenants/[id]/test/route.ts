import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth-check";
import { getTenant } from "@/lib/config-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const tenant = getTenant(id);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    // Test 1: Check if site is reachable
    const pingResp = await fetch(`${tenant.url}/api/method/ping`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!pingResp.ok) {
      return NextResponse.json({
        ok: false,
        error: `Site unreachable (HTTP ${pingResp.status})`,
      });
    }

    // Test 2: Check API key by fetching logged user
    const authResp = await fetch(`${tenant.url}/api/method/frappe.auth.get_logged_user`, {
      headers: { Authorization: `token ${tenant.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!authResp.ok) {
      return NextResponse.json({
        ok: false,
        error: `API key invalid (HTTP ${authResp.status})`,
      });
    }

    const data = await authResp.json();
    return NextResponse.json({
      ok: true,
      user: data.message,
      siteUrl: tenant.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ ok: false, error: message });
  }
}
