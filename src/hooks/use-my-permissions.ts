"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { queryKeys } from "@/hooks/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { CapabilityId } from "@/lib/permissions/capabilities";
import type { GrantsResponse } from "@/app/api/permissions/grants/route";

export type MyPermissions = {
  user: string;
  tenant: string;
  isSuperuser: boolean;
  capabilities: Set<string>;
  allowedScopes: Record<string, Set<string>>;
};

const EMPTY: MyPermissions = {
  user: "",
  tenant: "",
  isSuperuser: false,
  capabilities: new Set(),
  allowedScopes: {},
};

const SCOPE_WILDCARD = "*";

export function useMyPermissions(): {
  data: MyPermissions;
  isLoading: boolean;
  isError: boolean;
} {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: queryKeys.permissions.grants,
    queryFn: async (): Promise<MyPermissions> => {
      const resp = await fetch("/api/permissions/grants", { credentials: "include" });
      if (!resp.ok) {
        if (resp.status === 401) return EMPTY;
        throw new Error(`Failed to load permissions: ${resp.status}`);
      }
      const json: GrantsResponse = await resp.json();

      const allowedScopes: Record<string, Set<string>> = {};
      for (const [dim, values] of Object.entries(json.allowedScopes)) {
        allowedScopes[dim] = new Set(values);
      }

      return {
        user: json.user,
        tenant: json.tenant,
        isSuperuser: json.isSuperuser,
        capabilities: new Set(json.capabilities),
        allowedScopes,
      };
    },
    staleTime: 30_000,
    enabled: !!user,
  });

  return {
    data: query.data ?? EMPTY,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * True if the user has the given capability at all — regardless of scope
 * values. For scoped capabilities, use `useAllowedScopes` alongside this to
 * check whether any scope values are granted (an empty allowed set means the
 * user has the capability defined but cannot act on anything).
 */
export function useCapability(cap: CapabilityId): boolean {
  const { data } = useMyPermissions();
  if (data.isSuperuser) return true;
  return data.capabilities.has(cap);
}

export function useAllowedScopes(dim: string): {
  values: string[];
  hasWildcard: boolean;
  isEmpty: boolean;
} {
  const { data } = useMyPermissions();

  return useMemo(() => {
    if (data.isSuperuser) {
      return { values: [], hasWildcard: true, isEmpty: false };
    }
    const set = data.allowedScopes[dim];
    if (!set || set.size === 0) {
      return { values: [], hasWildcard: false, isEmpty: true };
    }
    const hasWildcard = set.has(SCOPE_WILDCARD);
    const values = [...set].filter((v) => v !== SCOPE_WILDCARD);
    return { values, hasWildcard, isEmpty: false };
  }, [data, dim]);
}
