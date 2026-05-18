import { NextResponse } from "next/server";
import { getTenants } from "@/lib/config-store";
import { getTenantSites, getTenantDisplayName } from "@/lib/tenant-config";

interface TenantMatch {
  name: string;
  siteUrl: string;
  directFetch: boolean;
}

// In-memory cache: email → { tenants, expiresAt }.
// 30min TTL — email→tenant mapping changes rarely (new user enrollment, tenant
// add/remove), and a stale cache for that window is acceptable since login
// flow can be retried after a cache miss.
const cache = new Map<string, { tenants: TenantMatch[]; expiresAt: number }>();
const CACHE_TTL = 30 * 60 * 1000;

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

  const cached = cache.get(email);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ tenants: cached.tenants });
  }

  const sites = getTenantSites();
  if (sites.length === 0) {
    return NextResponse.json({ error: "No tenant sites configured" }, { status: 500 });
  }

  // app.erpstable.com owns its own tenant registry (data/config.json) and queries
  // each tenant directly. Don't reuse directory.erpstable.com here — that's the
  // resolver for new.erpstable.com and may not include every tenant in this app.
  const configTenants = getTenants();
  const urlToName = new Map<string, string>();
  const urlToDirectFetch = new Map<string, boolean>();
  for (const t of configTenants) {
    urlToName.set(t.url, t.name);
    urlToDirectFetch.set(t.url, t.directFetch ?? false);
  }

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

  const tenants: TenantMatch[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const siteUrl = result.value;
      const name = urlToName.get(siteUrl) ?? getTenantDisplayName(siteUrl) ?? siteUrl;
      const directFetch = urlToDirectFetch.get(siteUrl) ?? false;
      tenants.push({ name, siteUrl, directFetch });
    }
  }

  if (tenants.length === 0) {
    return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
  }

  cache.set(email, { tenants, expiresAt: Date.now() + CACHE_TTL });
  return NextResponse.json({ tenants });
}
