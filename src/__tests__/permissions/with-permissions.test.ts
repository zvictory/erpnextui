import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AuthContext } from "@/lib/permissions/resolve-context";
import { PermissionDeniedError } from "@/lib/permissions/errors";

vi.mock("@/lib/permissions/resolve-context", () => ({
  resolveAuthContext: vi.fn(),
}));

vi.mock("@/lib/permissions/check-grant", async () => {
  const actual = await vi.importActual<typeof import("@/lib/permissions/check-grant")>(
    "@/lib/permissions/check-grant",
  );
  return {
    ...actual,
    logDenial: vi.fn().mockResolvedValue(undefined),
    logDryrunDenial: vi.fn().mockResolvedValue(undefined),
  };
});

import { resolveAuthContext } from "@/lib/permissions/resolve-context";
import { logDenial, logDryrunDenial } from "@/lib/permissions/check-grant";
import { withPermissions } from "@/lib/permissions/with-permissions";

const mockedResolve = vi.mocked(resolveAuthContext);
const mockedLogDenial = vi.mocked(logDenial);
const mockedLogDryrun = vi.mocked(logDryrunDenial);

function ctx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: "alice@example.com",
    tenant: "anjan",
    isSuperuser: false,
    grantedCapabilities: new Set(),
    allowedScopes: {},
    ...overrides,
  };
}

describe("withPermissions — enforce mode", () => {
  const originalMode = process.env.PERMISSIONS_MODE;

  beforeEach(() => {
    process.env.PERMISSIONS_MODE = "enforce";
    mockedResolve.mockReset();
    mockedLogDenial.mockClear();
    mockedLogDryrun.mockClear();
  });

  afterEach(() => {
    process.env.PERMISSIONS_MODE = originalMode;
  });

  it("runs the handler when an unscoped capability is granted", async () => {
    mockedResolve.mockResolvedValue(
      ctx({ grantedCapabilities: new Set(["sales_invoice.create"]) }),
    );

    const handler = vi.fn().mockResolvedValue("ok");
    const guarded = withPermissions<{ foo: string }, string>({
      capability: "sales_invoice.create",
      scope: { dim: null },
      name: "createSalesInvoice",
    })(handler);

    await expect(guarded({ foo: "bar" })).resolves.toBe("ok");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockedLogDenial).not.toHaveBeenCalled();
  });

  it("rejects with PermissionDeniedError and logs denial when capability missing", async () => {
    mockedResolve.mockResolvedValue(ctx());

    const handler = vi.fn();
    const guarded = withPermissions<{ foo: string }, string>({
      capability: "sales_invoice.create",
      scope: { dim: null },
      name: "createSalesInvoice",
    })(handler);

    await expect(guarded({ foo: "bar" })).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(handler).not.toHaveBeenCalled();
    expect(mockedLogDenial).toHaveBeenCalledTimes(1);
    expect(mockedLogDenial.mock.calls[0][1].actionName).toBe("createSalesInvoice");
  });

  it("extracts require-mode scope from input and allows when inside set", async () => {
    mockedResolve.mockResolvedValue(
      ctx({
        grantedCapabilities: new Set(["production.create"]),
        allowedScopes: { line: new Set(["A", "B"]) },
      }),
    );

    const handler = vi.fn().mockResolvedValue({ id: 1 });
    const guarded = withPermissions<{ lineId: string }, { id: number }>({
      capability: "production.create",
      scope: { dim: "line", mode: "require", extract: (i) => i.lineId },
      name: "createRun",
    })(handler);

    await expect(guarded({ lineId: "A" })).resolves.toEqual({ id: 1 });
    expect(handler).toHaveBeenCalledWith(
      { lineId: "A" },
      expect.objectContaining({ tenant: "anjan" }),
    );
  });

  it("rejects require-mode when scope value is outside the allowed set", async () => {
    mockedResolve.mockResolvedValue(
      ctx({
        grantedCapabilities: new Set(["production.create"]),
        allowedScopes: { line: new Set(["A"]) },
      }),
    );

    const handler = vi.fn();
    const guarded = withPermissions<{ lineId: string }, unknown>({
      capability: "production.create",
      scope: { dim: "line", mode: "require", extract: (i) => i.lineId },
      name: "createRun",
    })(handler);

    await expect(guarded({ lineId: "B" })).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(handler).not.toHaveBeenCalled();
    expect(mockedLogDenial).toHaveBeenCalledTimes(1);
    expect(mockedLogDenial.mock.calls[0][1]).toMatchObject({
      capability: "production.create",
      scopeDim: "line",
      scopeValue: "B",
    });
  });

  it("allows filter-mode when user has any scope values at all", async () => {
    mockedResolve.mockResolvedValue(
      ctx({
        grantedCapabilities: new Set(["production.read"]),
        allowedScopes: { line: new Set(["A"]) },
      }),
    );

    const handler = vi.fn().mockResolvedValue(["run-1"]);
    const guarded = withPermissions<void, string[]>({
      capability: "production.read",
      scope: { dim: "line", mode: "filter" },
      name: "listRuns",
    })(handler);

    await expect(guarded()).resolves.toEqual(["run-1"]);
  });

  it("rejects filter-mode when user has zero scope values", async () => {
    mockedResolve.mockResolvedValue(ctx({ grantedCapabilities: new Set(["production.read"]) }));

    const handler = vi.fn();
    const guarded = withPermissions<void, unknown>({
      capability: "production.read",
      scope: { dim: "line", mode: "filter" },
      name: "listRuns",
    })(handler);

    await expect(guarded()).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(mockedLogDenial.mock.calls[0][1].scopeValue).toBeNull();
  });

  it("fails closed (denied) when resolveAuthContext throws", async () => {
    mockedResolve.mockRejectedValue(new Error("sqlite exploded"));

    const handler = vi.fn();
    const guarded = withPermissions<void, unknown>({
      capability: "sales_invoice.create",
      scope: { dim: null },
      name: "createSalesInvoice",
    })(handler);

    await expect(guarded()).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(handler).not.toHaveBeenCalled();
  });

  it("superuser bypasses all grant checks", async () => {
    mockedResolve.mockResolvedValue(ctx({ isSuperuser: true }));

    const handler = vi.fn().mockResolvedValue("superpowers");
    const guarded = withPermissions<{ lineId: string }, string>({
      capability: "production.submit",
      scope: { dim: "line", mode: "require", extract: (i) => i.lineId },
      name: "submitRun",
    })(handler);

    await expect(guarded({ lineId: "Z" })).resolves.toBe("superpowers");
    expect(mockedLogDenial).not.toHaveBeenCalled();
  });
});

describe("withPermissions — dryrun mode", () => {
  const originalMode = process.env.PERMISSIONS_MODE;

  beforeEach(() => {
    process.env.PERMISSIONS_MODE = "dryrun";
    mockedResolve.mockReset();
    mockedLogDenial.mockClear();
    mockedLogDryrun.mockClear();
  });

  afterEach(() => {
    process.env.PERMISSIONS_MODE = originalMode;
  });

  it("lets the handler run even when the capability is missing, but logs dryrun denial", async () => {
    mockedResolve.mockResolvedValue(ctx());

    const handler = vi.fn().mockResolvedValue("allowed-in-dryrun");
    const guarded = withPermissions<void, string>({
      capability: "sales_invoice.create",
      scope: { dim: null },
      name: "createSalesInvoice",
    })(handler);

    await expect(guarded()).resolves.toBe("allowed-in-dryrun");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockedLogDryrun).toHaveBeenCalledTimes(1);
    expect(mockedLogDenial).not.toHaveBeenCalled();
  });

  it("still fails closed when the context resolver itself throws", async () => {
    mockedResolve.mockRejectedValue(new Error("no session"));

    const handler = vi.fn();
    const guarded = withPermissions<void, unknown>({
      capability: "sales_invoice.create",
      scope: { dim: null },
      name: "createSalesInvoice",
    })(handler);

    await expect(guarded()).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(handler).not.toHaveBeenCalled();
  });
});
