// Server-only module — reads tenant config from config.json first, falls back to env vars

import { getTenants, configExists } from "./config-store";

interface TenantSite {
  name: string; // "anjan"
  url: string; // "https://anjan.erpstable.com"
  apiKey: string; // "api_key:api_secret"
}

/**
 * Get tenant sites from config.json (primary) or env vars (fallback).
 * Config.json is the new source of truth managed via the admin panel.
 * Env vars are kept for backward compatibility during migration.
 */
export function getTenantSites(): TenantSite[] {
  // Primary: read from config.json
  if (configExists()) {
    const tenants = getTenants();
    const enabled = tenants
      .filter((t) => t.enabled)
      .map((t) => ({ name: t.id, url: t.url, apiKey: t.apiKey }));
    if (enabled.length > 0) return enabled;
  }

  // Fallback: env vars (legacy)
  return getTenantSitesFromEnv();
}

function getTenantSitesFromEnv(): TenantSite[] {
  const raw = process.env.TENANT_SITES ?? "";
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => {
      const colonIdx = entry.indexOf(":");
      if (colonIdx === -1) return null;
      const name = entry.slice(0, colonIdx).trim();
      const url = entry.slice(colonIdx + 1).trim();
      const envKey = `TENANT_API_KEY_${name.toUpperCase()}`;
      const apiKey = process.env[envKey] ?? "";
      if (!name || !url || !apiKey) return null;
      return { name, url, apiKey };
    })
    .filter((s): s is TenantSite => s !== null);
}

/**
 * Extract display name from a site URL.
 * "https://anjan.erpstable.com" → "Anjan"
 */
export function getTenantDisplayName(siteUrl: string): string | null {
  try {
    const hostname = new URL(siteUrl).hostname;
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return null;
  }
}
