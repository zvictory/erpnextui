import { NextResponse } from "next/server";
import { getTenants } from "@/lib/config-store";
import { getTenantSites, getTenantDisplayName } from "@/lib/tenant-config";

interface TenantMatch {
  name: string;
  siteUrl: string;
}

// In-memory cache: email → { tenants, expiresAt }
const cache = new Map<string, { tenants: TenantMatch[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(email);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ tenants: cached.tenants });
  }

  const sites = getTenantSites();
  if (sites.length === 0) {
    return NextResponse.json({ error: "No tenant sites configured" }, { status: 500 });
  }

  // Build url → display name lookup from config-store tenants
  const configTenants = getTenants();
  const urlToName = new Map<string, string>();
  for (const t of configTenants) {
    urlToName.set(t.url, t.name);
  }

  // Query all sites in parallel
  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const url = `${site.url}/api/resource/User/${encodeURIComponent(email)}?fields=["enabled"]`;
      const resp = await fetch(url, {
        headers: { Authorization: `token ${site.apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.data?.enabled === 1) return site.url;
      return null;
    }),
  );

  // Collect ALL matching tenants
  const tenants: TenantMatch[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const siteUrl = result.value;
      const name = urlToName.get(siteUrl) ?? getTenantDisplayName(siteUrl) ?? siteUrl;
      tenants.push({ name, siteUrl });
    }
  }

  if (tenants.length === 0) {
    return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
  }

  cache.set(email, { tenants, expiresAt: Date.now() + CACHE_TTL });
  return NextResponse.json({ tenants });
}
