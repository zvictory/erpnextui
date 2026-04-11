import { cookies } from "next/headers";
import { db } from "@/db";
import { userCapabilities } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isSuperuser } from "./superuser";
import { PermissionResolutionError } from "./errors";
import { SCOPE_WILDCARD } from "./constants";

export type AuthContext = {
  user: string;
  tenant: string;
  isSuperuser: boolean;
  allowedScopes: Record<string, Set<string>>;
  grantedCapabilities: Set<string>;
};

const TENANT_COOKIE = "stable-tenant";
const USER_COOKIE = "stable-user-email";
const SID_COOKIE = "sid";

type CacheEntry = { ctx: AuthContext; expiresAt: number };
const contextCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function cacheKey(tenant: string, user: string): string {
  return `${tenant}::${user.toLowerCase()}`;
}

export function invalidateAuthContext(tenant: string, user: string): void {
  contextCache.delete(cacheKey(tenant, user));
}

export function invalidateAllAuthContexts(): void {
  contextCache.clear();
}

async function readSessionIdentity(): Promise<{ tenant: string; user: string }> {
  const jar = await cookies();

  const tenant = jar.get(TENANT_COOKIE)?.value;
  const user = jar.get(USER_COOKIE)?.value;

  if (!tenant || !user) {
    const sid = jar.get(SID_COOKIE)?.value;
    if (!sid) {
      throw new PermissionResolutionError(
        "No active session — missing stable-tenant, stable-user-email, or Frappe sid cookie",
      );
    }
    throw new PermissionResolutionError(
      "Session cookies present but stable-tenant/stable-user-email not set — login flow must be updated to set them server-side",
    );
  }

  return { tenant, user: user.toLowerCase() };
}

async function loadGrants(tenant: string, userEmail: string): Promise<AuthContext> {
  const rows = await db
    .select({
      capabilityId: userCapabilities.capabilityId,
      scopeDim: userCapabilities.scopeDim,
      scopeValue: userCapabilities.scopeValue,
    })
    .from(userCapabilities)
    .where(and(eq(userCapabilities.tenant, tenant), eq(userCapabilities.userEmail, userEmail)));

  const grantedCapabilities = new Set<string>();
  const allowedScopes: Record<string, Set<string>> = {};

  for (const row of rows) {
    grantedCapabilities.add(row.capabilityId);
    if (row.scopeDim && row.scopeDim !== SCOPE_WILDCARD) {
      const set = (allowedScopes[row.scopeDim] ??= new Set<string>());
      set.add(row.scopeValue);
    }
  }

  return {
    user: userEmail,
    tenant,
    isSuperuser: isSuperuser(userEmail),
    grantedCapabilities,
    allowedScopes,
  };
}

export async function resolveAuthContext(): Promise<AuthContext> {
  const { tenant, user } = await readSessionIdentity();
  const key = cacheKey(tenant, user);

  const cached = contextCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ctx;
  }

  if (isSuperuser(user)) {
    const ctx: AuthContext = {
      user,
      tenant,
      isSuperuser: true,
      grantedCapabilities: new Set(),
      allowedScopes: {},
    };
    contextCache.set(key, { ctx, expiresAt: Date.now() + CACHE_TTL_MS });
    return ctx;
  }

  const ctx = await loadGrants(tenant, user);
  contextCache.set(key, { ctx, expiresAt: Date.now() + CACHE_TTL_MS });
  return ctx;
}

export function hasWildcardScope(ctx: AuthContext, dim: string): boolean {
  return ctx.allowedScopes[dim]?.has(SCOPE_WILDCARD) ?? false;
}

export function allowedScopeValues(ctx: AuthContext, dim: string): string[] {
  const set = ctx.allowedScopes[dim];
  if (!set) return [];
  return [...set];
}
