"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";

export type AdminUserRow = {
  userEmail: string;
  grantCount: number;
  lastGrantedAt: string | null;
};

export type AdminGrantRow = {
  capabilityId: string;
  scopeDim: string;
  scopeValue: string;
  grantedBy: string;
  grantedAt: string | null;
};

export type AdminAuditRow = {
  id: number;
  event?: string;
  tenant: string;
  userEmail: string;
  capabilityId: string;
  scopeDim: string | null;
  scopeValue: string | null;
  actorEmail?: string;
  actionName?: string;
  occurredAt: string | null;
  details?: string | null;
};

export function useAdminPermissionUsers() {
  return useQuery({
    queryKey: [...queryKeys.permissions.grants, "admin", "users"] as const,
    queryFn: async (): Promise<AdminUserRow[]> => {
      const resp = await fetch("/api/admin/permissions/users", { credentials: "include" });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      const json = await resp.json();
      return json.users ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAdminUserGrants(userEmail: string | null) {
  return useQuery({
    queryKey: [...queryKeys.permissions.grants, "admin", "user", userEmail] as const,
    queryFn: async (): Promise<AdminGrantRow[]> => {
      if (!userEmail) return [];
      const resp = await fetch(
        `/api/admin/permissions/users/${encodeURIComponent(userEmail)}`,
        { credentials: "include" },
      );
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      const json = await resp.json();
      return json.grants ?? [];
    },
    enabled: !!userEmail,
    staleTime: 30_000,
  });
}

export function useUpdateUserGrants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userEmail: string;
      grants: Array<{ capabilityId: string; scopeDim: string; scopeValue: string }>;
    }) => {
      const resp = await fetch(
        `/api/admin/permissions/users/${encodeURIComponent(input.userEmail)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grants: input.grants }),
        },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed: ${resp.status}`);
      }
      return resp.json() as Promise<{ userEmail: string; added: number; removed: number }>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [...queryKeys.permissions.grants, "admin"] });
      qc.invalidateQueries({
        queryKey: [...queryKeys.permissions.grants, "admin", "user", vars.userEmail],
      });
    },
  });
}

export type AdminRoleTemplateItem = {
  id?: number;
  templateId?: string;
  capabilityId: string;
  defaultScopeDim: string;
};

export type AdminRoleTemplate = {
  id: string;
  tenant?: string;
  name: string;
  description: string | null;
  createdAt: string | null;
  items: AdminRoleTemplateItem[];
};

export function useAdminRoleTemplates() {
  return useQuery({
    queryKey: [...queryKeys.permissions.grants, "admin", "role-templates"] as const,
    queryFn: async (): Promise<AdminRoleTemplate[]> => {
      const resp = await fetch("/api/admin/permissions/role-templates", {
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      const json = await resp.json();
      return json.templates ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      description?: string;
      items: Array<{ capabilityId: string; defaultScopeDim: string }>;
    }) => {
      const resp = await fetch("/api/admin/permissions/role-templates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed: ${resp.status}`);
      }
      return resp.json() as Promise<{ id: string; itemsCount: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...queryKeys.permissions.grants, "admin", "role-templates"],
      });
    },
  });
}

export function useUpdateRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      description?: string | null;
      items?: Array<{ capabilityId: string; defaultScopeDim: string }>;
    }) => {
      const { id, ...body } = input;
      const resp = await fetch(
        `/api/admin/permissions/role-templates/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed: ${resp.status}`);
      }
      return resp.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...queryKeys.permissions.grants, "admin", "role-templates"],
      });
    },
  });
}

export function useDeleteRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const resp = await fetch(
        `/api/admin/permissions/role-templates/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed: ${resp.status}`);
      }
      return resp.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...queryKeys.permissions.grants, "admin", "role-templates"],
      });
    },
  });
}

export function useAdminAuditLog(source: "enforce" | "dryrun" = "enforce") {
  return useQuery({
    queryKey: [...queryKeys.permissions.grants, "admin", "audit", source] as const,
    queryFn: async (): Promise<AdminAuditRow[]> => {
      const resp = await fetch(`/api/admin/permissions/audit?source=${source}&limit=100`, {
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      const json = await resp.json();
      return json.rows ?? [];
    },
    staleTime: 15_000,
  });
}
