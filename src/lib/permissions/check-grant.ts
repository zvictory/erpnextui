import { db } from "@/db";
import { permissionAudit, permissionAuditDryrun } from "@/db/schema";
import type { AuthContext } from "./resolve-context";
import { SCOPE_WILDCARD } from "./constants";
import { BUILTIN_CAPABILITIES, type CapabilityId } from "./capabilities";

export type ScopeCheck =
  | { dim: null }
  | { dim: string; mode: "require"; value: string }
  | { dim: string; mode: "filter" };

export type GrantDecision =
  | { granted: true }
  | { granted: false; reason: "no_capability" | "scope_out_of_range" };

export function checkGrant(
  ctx: AuthContext,
  capability: CapabilityId,
  scope: ScopeCheck,
): GrantDecision {
  if (ctx.isSuperuser) return { granted: true };

  if (!ctx.grantedCapabilities.has(capability)) {
    return { granted: false, reason: "no_capability" };
  }

  if (scope.dim === null) return { granted: true };

  const allowed = ctx.allowedScopes[scope.dim];
  if (!allowed || allowed.size === 0) {
    return { granted: false, reason: "scope_out_of_range" };
  }

  if (allowed.has(SCOPE_WILDCARD)) return { granted: true };

  if (scope.mode === "filter") return { granted: true };

  if (!allowed.has(scope.value)) {
    return { granted: false, reason: "scope_out_of_range" };
  }

  return { granted: true };
}

const builtinScopeDimMap: Record<string, string | null> = {};
for (const [key, def] of Object.entries(BUILTIN_CAPABILITIES)) {
  builtinScopeDimMap[key] = (def as { scopeDim: string | null }).scopeDim;
}

export function getCapabilityScopeDim(capability: CapabilityId): string | null {
  if (capability in builtinScopeDimMap) {
    return builtinScopeDimMap[capability];
  }
  return null;
}

export async function logDenial(
  ctx: AuthContext,
  opts: {
    capability: string;
    scopeDim: string | null;
    scopeValue: string | null;
    actionName: string;
  },
): Promise<void> {
  try {
    await db.insert(permissionAudit).values({
      event: "denied",
      tenant: ctx.tenant,
      userEmail: ctx.user,
      capabilityId: opts.capability,
      scopeDim: opts.scopeDim,
      scopeValue: opts.scopeValue,
      actorEmail: ctx.user,
      details: JSON.stringify({ action: opts.actionName }),
    });
  } catch {
    // Audit log is advisory — swallow failures so they can't open a hole.
  }
}

export async function logDryrunDenial(
  ctx: AuthContext,
  opts: {
    capability: string;
    scopeDim: string | null;
    scopeValue: string | null;
    actionName: string;
  },
): Promise<void> {
  try {
    await db.insert(permissionAuditDryrun).values({
      tenant: ctx.tenant,
      userEmail: ctx.user,
      capabilityId: opts.capability,
      scopeDim: opts.scopeDim,
      scopeValue: opts.scopeValue,
      actionName: opts.actionName,
    });
  } catch {
    // best effort
  }
}
