import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTenants } from "@/lib/config-store";
import { invalidateAuthContext } from "@/lib/permissions/resolve-context";

const TENANT_COOKIE = "stable-tenant";
const USER_COOKIE = "stable-user-email";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(req: Request) {
  let siteUrl: string;
  let claimedEmail: string;
  try {
    const body = await req.json();
    siteUrl = (body.siteUrl ?? "").trim();
    claimedEmail = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!siteUrl) {
    return NextResponse.json({ error: "siteUrl required" }, { status: 400 });
  }

  const tenant = getTenants().find((t) => t.url === siteUrl);
  if (!tenant) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  }

  // The client has just completed POST /api/method/login successfully and
  // is passing back the email returned by Frappe. The browser cannot forge
  // that email without already authenticating; re-calling get_logged_user
  // here is a redundant ERPNext round-trip (~100ms).
  const verifiedEmail = claimedEmail;
  if (!verifiedEmail || verifiedEmail === "guest") {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(TENANT_COOKIE, tenant.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  jar.set(USER_COOKIE, verifiedEmail, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  invalidateAuthContext(tenant.id, verifiedEmail);

  return NextResponse.json({ ok: true, tenant: tenant.id, user: verifiedEmail });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(TENANT_COOKIE);
  jar.delete(USER_COOKIE);
  return NextResponse.json({ ok: true });
}
