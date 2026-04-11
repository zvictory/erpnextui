"use client";

import type { ReactNode } from "react";
import { useAllowedScopes, useCapability } from "@/hooks/use-my-permissions";
import type { CapabilityId } from "@/lib/permissions/capabilities";

type IfCapabilityProps = {
  cap: CapabilityId;
  scopeDim?: string;
  scopeValue?: string;
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Field-level gate. Renders children only when the current user has the
 * capability and, if scoped, can act on the given scope value.
 *
 * - No `scopeDim`: unscoped capability — just checks capability membership.
 * - `scopeDim` without `scopeValue`: renders as long as user has *any* scope
 *   value for that dimension (drives "hide if empty" UX).
 * - `scopeDim` + `scopeValue`: renders only when that specific value (or
 *   wildcard) is granted.
 */
export function IfCapability({
  cap,
  scopeDim,
  scopeValue,
  fallback = null,
  children,
}: IfCapabilityProps) {
  const hasCap = useCapability(cap);
  const scopes = useAllowedScopes(scopeDim ?? "");

  if (!hasCap) return <>{fallback}</>;

  if (!scopeDim) return <>{children}</>;

  if (scopes.hasWildcard) return <>{children}</>;
  if (scopes.isEmpty) return <>{fallback}</>;

  if (scopeValue !== undefined && !scopes.values.includes(scopeValue)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
