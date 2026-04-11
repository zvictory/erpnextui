import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
  }),
}));

type GrantRow = { capabilityId: string; scopeDim: string; scopeValue: string };
let stubbedRows: GrantRow[] = [];

vi.mock("@/db", () => {
  const chain = {
    from: () => chain,
    where: () => Promise.resolve(stubbedRows),
  };
  return {
    db: {
      select: () => chain,
    },
  };
});

vi.mock("@/db/schema", () => ({
  userCapabilities: {
    tenant: "tenant",
    userEmail: "user_email",
    capabilityId: "capability_id",
    scopeDim: "scope_dim",
    scopeValue: "scope_value",
  },
}));

import {
  resolveAuthContext,
  invalidateAuthContext,
  invalidateAllAuthContexts,
  hasWildcardScope,
  allowedScopeValues,
  type AuthContext,
} from "@/lib/permissions/resolve-context";

function setSession(tenant: string, user: string) {
  cookieStore.clear();
  cookieStore.set("stable-tenant", tenant);
  cookieStore.set("stable-user-email", user);
}

describe("resolveAuthContext — grant loading", () => {
  beforeEach(() => {
    invalidateAllAuthContexts();
    stubbedRows = [];
  });

  afterEach(() => {
    cookieStore.clear();
  });

  it("throws a PermissionResolutionError when no session cookies are present", async () => {
    cookieStore.clear();
    await expect(resolveAuthContext()).rejects.toThrow(/No active session/);
  });

  it("builds grantedCapabilities and allowedScopes from DB rows", async () => {
    setSession("anjan", "alice@example.com");
    stubbedRows = [
      { capabilityId: "production.read", scopeDim: "line", scopeValue: "A" },
      { capabilityId: "production.read", scopeDim: "line", scopeValue: "B" },
      { capabilityId: "sales_invoice.read", scopeDim: "*", scopeValue: "*" },
    ];

    const ctx = await resolveAuthContext();

    expect(ctx.user).toBe("alice@example.com");
    expect(ctx.tenant).toBe("anjan");
    expect(ctx.isSuperuser).toBe(false);
    expect(ctx.grantedCapabilities.has("production.read")).toBe(true);
    expect(ctx.grantedCapabilities.has("sales_invoice.read")).toBe(true);
    expect([...ctx.allowedScopes.line!].sort()).toEqual(["A", "B"]);
    // Wildcard scopeDim "*" should NOT be added as a scope dimension key.
    expect(ctx.allowedScopes["*"]).toBeUndefined();
  });

  it("unions scopes across multiple grants for the same capability", async () => {
    setSession("anjan", "bob@example.com");
    stubbedRows = [
      { capabilityId: "warehouse.manage", scopeDim: "warehouse", scopeValue: "WH-01" },
      { capabilityId: "warehouse.manage", scopeDim: "warehouse", scopeValue: "WH-02" },
      { capabilityId: "warehouse.manage", scopeDim: "warehouse", scopeValue: "WH-03" },
    ];

    const ctx = await resolveAuthContext();
    expect([...ctx.allowedScopes.warehouse!].sort()).toEqual(["WH-01", "WH-02", "WH-03"]);
  });

  it("returns cached context on second call without hitting the DB again", async () => {
    setSession("anjan", "cache@example.com");
    stubbedRows = [
      { capabilityId: "production.read", scopeDim: "line", scopeValue: "A" },
    ];

    const first = await resolveAuthContext();

    // Swap rows — a cache hit should ignore this and return the first snapshot.
    stubbedRows = [
      { capabilityId: "production.read", scopeDim: "line", scopeValue: "B" },
    ];
    const second = await resolveAuthContext();

    expect(second).toBe(first);
    expect([...second.allowedScopes.line!]).toEqual(["A"]);
  });

  it("invalidateAuthContext forces a fresh DB read for the next call", async () => {
    setSession("anjan", "invalid@example.com");
    stubbedRows = [
      { capabilityId: "production.read", scopeDim: "line", scopeValue: "A" },
    ];
    await resolveAuthContext();

    stubbedRows = [
      { capabilityId: "production.read", scopeDim: "line", scopeValue: "Z" },
    ];
    invalidateAuthContext("anjan", "invalid@example.com");

    const refreshed = await resolveAuthContext();
    expect([...refreshed.allowedScopes.line!]).toEqual(["Z"]);
  });

  it("marks the hardcoded superuser and skips DB lookup", async () => {
    setSession("anjan", "zvictory2001@gmail.com");
    stubbedRows = []; // irrelevant — should never be read

    const ctx = await resolveAuthContext();
    expect(ctx.isSuperuser).toBe(true);
    expect(ctx.grantedCapabilities.size).toBe(0);
  });

  it("lowercases email in cookie and in the cache key", async () => {
    setSession("anjan", "Mixed@Example.com");
    stubbedRows = [
      { capabilityId: "dashboard.read", scopeDim: "*", scopeValue: "*" },
    ];

    const ctx = await resolveAuthContext();
    expect(ctx.user).toBe("mixed@example.com");
  });
});

describe("hasWildcardScope / allowedScopeValues", () => {
  const base: AuthContext = {
    user: "a@b.com",
    tenant: "anjan",
    isSuperuser: false,
    grantedCapabilities: new Set(),
    allowedScopes: {
      line: new Set(["*"]),
      warehouse: new Set(["WH-01", "WH-02"]),
    },
  };

  it("hasWildcardScope returns true for dimensions with the wildcard", () => {
    expect(hasWildcardScope(base, "line")).toBe(true);
    expect(hasWildcardScope(base, "warehouse")).toBe(false);
    expect(hasWildcardScope(base, "company")).toBe(false);
  });

  it("allowedScopeValues lists explicit values and returns [] for missing dims", () => {
    expect(allowedScopeValues(base, "warehouse").sort()).toEqual(["WH-01", "WH-02"]);
    expect(allowedScopeValues(base, "company")).toEqual([]);
  });
});
