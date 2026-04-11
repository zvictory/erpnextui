import { NextResponse } from "next/server";
import { requireGrant, type RequireGrantOptions } from "./require-grant";
import { PermissionDeniedError, PermissionResolutionError } from "./errors";
import type { AuthContext } from "./resolve-context";

/**
 * Wrap an API route handler with a capability check. Returns the resolved
 * `AuthContext` on success, or a 401/403 `NextResponse` the caller should
 * return directly.
 */
export async function requireGrantApi(
  opts: RequireGrantOptions,
): Promise<{ ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }> {
  try {
    const ctx = await requireGrant(opts);
    return { ok: true, ctx };
  } catch (err) {
    if (err instanceof PermissionResolutionError) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      };
    }
    if (err instanceof PermissionDeniedError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Permission denied: ${err.capability}` },
          { status: 403 },
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: err instanceof Error ? err.message : "Internal error" },
        { status: 500 },
      ),
    };
  }
}
