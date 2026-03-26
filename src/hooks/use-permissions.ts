"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { frappe, frappeCall } from "@/lib/frappe-client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/hooks/query-keys";
import {
  MANAGED_DOCTYPES,
  ACTIONS,
  NONE_GRANTED,
  type DoctypePermissions,
} from "@/lib/permissions";

interface HasPermissionResponse {
  message: { has_permission: boolean };
}

const STALE_TIME = 30 * 60 * 1000; // 30 minutes — permissions rarely change mid-session

/**
 * Batch-fetch all permissions in a single RPC call using the custom
 * stable_erp_api.get_bulk_permissions method.
 * Falls back to individual has_permission calls if the batch method is unavailable.
 */
async function fetchAllPermissions(): Promise<Record<string, DoctypePermissions>> {
  try {
    return await frappe.call<Record<string, DoctypePermissions>>(
      "stable_erp_api.get_bulk_permissions",
      { doctypes: JSON.stringify(MANAGED_DOCTYPES) },
    );
  } catch {
    // Fallback: individual permission checks (119 requests)
    return fetchAllPermissionsFallback();
  }
}

async function fetchAllPermissionsFallback(): Promise<Record<string, DoctypePermissions>> {
  const entries = await Promise.all(
    MANAGED_DOCTYPES.map(async (doctype): Promise<[string, DoctypePermissions]> => {
      const actionResults = await Promise.all(
        ACTIONS.map(async (action) => {
          try {
            const params = new URLSearchParams({ doctype, docname: "", perm_type: action });
            const result = await frappeCall<HasPermissionResponse>(
              `/api/method/frappe.client.has_permission?${params}`,
            );
            return [action, !!result.message?.has_permission] as const;
          } catch {
            return [action, false] as const;
          }
        }),
      );
      return [doctype, Object.fromEntries(actionResults) as unknown as DoctypePermissions];
    }),
  );
  return Object.fromEntries(entries);
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const { data: permMap = {}, isLoading } = useQuery({
    queryKey: queryKeys.permissions.all(user ?? ""),
    queryFn: fetchAllPermissions,
    enabled: !!user,
    staleTime: STALE_TIME,
    retry: 2,
  });

  const permissions = useCallback(
    (doctype: string): DoctypePermissions => permMap[doctype] ?? NONE_GRANTED,
    [permMap],
  );

  const canRead = useCallback((doctype: string) => permissions(doctype).read, [permissions]);
  const canCreate = useCallback((doctype: string) => permissions(doctype).create, [permissions]);
  const canWrite = useCallback((doctype: string) => permissions(doctype).write, [permissions]);
  const canDelete = useCallback((doctype: string) => permissions(doctype).delete, [permissions]);
  const canSubmit = useCallback((doctype: string) => permissions(doctype).submit, [permissions]);
  const canCancel = useCallback((doctype: string) => permissions(doctype).cancel, [permissions]);

  return useMemo(
    () => ({
      isLoading,
      permissions,
      canRead,
      canCreate,
      canWrite,
      canDelete,
      canSubmit,
      canCancel,
    }),
    [isLoading, permissions, canRead, canCreate, canWrite, canDelete, canSubmit, canCancel],
  );
}
