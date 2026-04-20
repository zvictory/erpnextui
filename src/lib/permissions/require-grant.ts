import { resolveAuthContext, type AuthContext } from "./resolve-context";
import { checkGrant, logDenial, logDryrunDenial, type ScopeCheck } from "./check-grant";
import { PermissionDeniedError, PermissionResolutionError } from "./errors";
import { getPermissionMode } from "./with-permissions";
import type { CapabilityId } from "./capabilities";

export type RequireGrantOptions = {
  capability: CapabilityId;
  scope: ScopeCheck;
  actionName: string;
};

/**
 * Inline permission check for existing server actions that return
 * {success, data} | {success, error}. Use instead of `withPermissions`
 * when you don't want to restructure the action.
 *
 * Returns the resolved AuthContext on success, throws PermissionDeniedError
 * on denial (in enforce mode). In dryrun mode, logs the denial and
 * returns a best-effort context so the action can continue.
 */
export async function requireGrant(opts: RequireGrantOptions): Promise<AuthContext> {
  let ctx: AuthContext;
  try {
    ctx = await resolveAuthContext();
  } catch (err) {
    if (getPermissionMode() === "dryrun") {
      // In dryrun, missing session cookies shouldn't block — return a
      // synthetic anonymous context so the action proceeds. We can't audit
      // because there's no tenant/user to attribute.
      return {
        user: "anonymous",
        tenant: "unknown",
        isSuperuser: false,
        grantedCapabilities: new Set(),
        allowedScopes: {},
      };
    }
    throw new PermissionDeniedError({
      capability: opts.capability,
      message: `Permission context unavailable: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }

  const decision = checkGrant(ctx, opts.capability, opts.scope);
  if (decision.granted) return ctx;

  const scopeDim = opts.scope.dim;
  const scopeValue =
    opts.scope.dim !== null && opts.scope.mode === "require" ? opts.scope.value : null;

  if (getPermissionMode() === "dryrun" && !ctx.isSuperuser) {
    await logDryrunDenial(ctx, {
      capability: opts.capability,
      scopeDim,
      scopeValue,
      actionName: opts.actionName,
    });
    return ctx;
  }

  await logDenial(ctx, {
    capability: opts.capability,
    scopeDim,
    scopeValue,
    actionName: opts.actionName,
  });
  throw new PermissionDeniedError({
    capability: opts.capability,
    scopeDim,
    scopeValue,
  });
}

/**
 * If `err` is a permission error, return the project's {success: false, error}
 * shape. Otherwise return null so the caller can fall through to its own
 * error handling.
 */
export function toActionError(err: unknown): { success: false; error: string } | null {
  if (err instanceof PermissionDeniedError) {
    const scope = err.scopeDim ? ` for ${err.scopeDim}=${err.scopeValue ?? "*"}` : "";
    return {
      success: false as const,
      error: `Permission denied: ${err.capability}${scope}`,
    };
  }
  if (err instanceof PermissionResolutionError) {
    return { success: false as const, error: "Not authenticated" };
  }
  return null;
}
