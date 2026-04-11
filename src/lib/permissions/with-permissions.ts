import type { AuthContext } from "./resolve-context";
import { resolveAuthContext } from "./resolve-context";
import { checkGrant, logDenial, logDryrunDenial, type ScopeCheck } from "./check-grant";
import { PermissionDeniedError } from "./errors";
import type { CapabilityId } from "./capabilities";

export type PermissionMode = "enforce" | "dryrun";

export function getPermissionMode(): PermissionMode {
  return process.env.PERMISSIONS_MODE === "dryrun" ? "dryrun" : "enforce";
}

type ScopeSpec<I> =
  | { dim: null }
  | { dim: string; mode: "require"; extract: (input: I) => string }
  | { dim: string; mode: "filter" };

export type GuardedOptions<I> = {
  capability: CapabilityId;
  scope: ScopeSpec<I>;
  name: string;
};

export type GuardedHandler<I, O> = (input: I, ctx: AuthContext) => Promise<O>;

export function withPermissions<I, O>(opts: GuardedOptions<I>) {
  return (handler: GuardedHandler<I, O>) => {
    return async (input: I): Promise<O> => {
      let ctx: AuthContext;
      try {
        ctx = await resolveAuthContext();
      } catch (err) {
        throw new PermissionDeniedError({
          capability: opts.capability,
          message: `Permission context unavailable: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }

      const scopeCheck: ScopeCheck =
        opts.scope.dim === null
          ? { dim: null }
          : opts.scope.mode === "filter"
            ? { dim: opts.scope.dim, mode: "filter" }
            : { dim: opts.scope.dim, mode: "require", value: opts.scope.extract(input) };

      const decision = checkGrant(ctx, opts.capability, scopeCheck);

      if (!decision.granted) {
        const scopeDim = opts.scope.dim;
        const scopeValue =
          opts.scope.dim !== null && opts.scope.mode === "require"
            ? opts.scope.extract(input)
            : null;

        if (getPermissionMode() === "dryrun" && !ctx.isSuperuser) {
          await logDryrunDenial(ctx, {
            capability: opts.capability,
            scopeDim,
            scopeValue,
            actionName: opts.name,
          });
          return handler(input, ctx);
        }

        await logDenial(ctx, {
          capability: opts.capability,
          scopeDim,
          scopeValue,
          actionName: opts.name,
        });
        throw new PermissionDeniedError({
          capability: opts.capability,
          scopeDim,
          scopeValue,
        });
      }

      return handler(input, ctx);
    };
  };
}
