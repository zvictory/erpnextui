import { describe, it, expect } from "vitest";
import { checkGrant } from "@/lib/permissions/check-grant";
import type { AuthContext } from "@/lib/permissions/resolve-context";

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: "alice@example.com",
    tenant: "anjan",
    isSuperuser: false,
    grantedCapabilities: new Set<string>(),
    allowedScopes: {},
    ...overrides,
  };
}

describe("checkGrant — unscoped capabilities", () => {
  it("denies when capability is missing", () => {
    const ctx = makeCtx();
    expect(checkGrant(ctx, "sales_invoice.create", { dim: null })).toEqual({
      granted: false,
      reason: "no_capability",
    });
  });

  it("allows when the exact capability is granted", () => {
    const ctx = makeCtx({ grantedCapabilities: new Set(["sales_invoice.create"]) });
    expect(checkGrant(ctx, "sales_invoice.create", { dim: null })).toEqual({ granted: true });
  });
});

describe("checkGrant — scoped (require mode)", () => {
  it("denies when user has the capability but no scope values at all", () => {
    const ctx = makeCtx({ grantedCapabilities: new Set(["production.create"]) });
    expect(
      checkGrant(ctx, "production.create", { dim: "line", mode: "require", value: "A" }),
    ).toEqual({ granted: false, reason: "scope_out_of_range" });
  });

  it("denies when value is outside the allowed scope set", () => {
    const ctx = makeCtx({
      grantedCapabilities: new Set(["production.create"]),
      allowedScopes: { line: new Set(["A"]) },
    });
    expect(
      checkGrant(ctx, "production.create", { dim: "line", mode: "require", value: "B" }),
    ).toEqual({ granted: false, reason: "scope_out_of_range" });
  });

  it("allows when value is inside the allowed scope set", () => {
    const ctx = makeCtx({
      grantedCapabilities: new Set(["production.create"]),
      allowedScopes: { line: new Set(["A", "B"]) },
    });
    expect(
      checkGrant(ctx, "production.create", { dim: "line", mode: "require", value: "A" }),
    ).toEqual({ granted: true });
  });

  it("allows any value when wildcard scope is granted", () => {
    const ctx = makeCtx({
      grantedCapabilities: new Set(["production.create"]),
      allowedScopes: { line: new Set(["*"]) },
    });
    expect(
      checkGrant(ctx, "production.create", { dim: "line", mode: "require", value: "Z" }),
    ).toEqual({ granted: true });
  });
});

describe("checkGrant — scoped (filter mode)", () => {
  it("denies filter-mode when the user has zero scope values (menu should hide)", () => {
    const ctx = makeCtx({ grantedCapabilities: new Set(["production.read"]) });
    expect(checkGrant(ctx, "production.read", { dim: "line", mode: "filter" })).toEqual({
      granted: false,
      reason: "scope_out_of_range",
    });
  });

  it("allows filter-mode when user has at least one scope value", () => {
    const ctx = makeCtx({
      grantedCapabilities: new Set(["production.read"]),
      allowedScopes: { line: new Set(["A"]) },
    });
    expect(checkGrant(ctx, "production.read", { dim: "line", mode: "filter" })).toEqual({
      granted: true,
    });
  });

  it("allows filter-mode with wildcard scope", () => {
    const ctx = makeCtx({
      grantedCapabilities: new Set(["production.read"]),
      allowedScopes: { line: new Set(["*"]) },
    });
    expect(checkGrant(ctx, "production.read", { dim: "line", mode: "filter" })).toEqual({
      granted: true,
    });
  });
});

describe("checkGrant — superuser", () => {
  it("short-circuits to granted regardless of capability/scope", () => {
    const ctx = makeCtx({ isSuperuser: true });
    expect(checkGrant(ctx, "anything.you.like", { dim: null })).toEqual({ granted: true });
    expect(
      checkGrant(ctx, "production.submit", { dim: "line", mode: "require", value: "B" }),
    ).toEqual({ granted: true });
  });
});
