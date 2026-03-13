"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

interface SessionStatus {
  valid: boolean;
  setupComplete: boolean;
}

interface TenantResponse {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  enabledModuleGroups?: string[];
  createdAt: string;
  updatedAt: string;
}

interface PlatformSettings {
  appName: string;
  tenantCacheTtlMs: number;
  provisioningApiUrl?: string;
  provisioningApiKey?: string;
  provisioningApiSecret?: string;
}

interface TestResult {
  ok: boolean;
  error?: string;
  user?: string;
  siteUrl?: string;
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(url, options);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Request failed (${resp.status})`);
  return data;
}

// Session
export function useAdminSession() {
  return useQuery({
    queryKey: queryKeys.admin.session,
    queryFn: () => adminFetch<SessionStatus>("/api/admin/session"),
    retry: false,
    staleTime: 30_000,
  });
}

// Setup
export function useSetupStatus() {
  return useQuery({
    queryKey: queryKeys.admin.setup,
    queryFn: () => adminFetch<{ setupComplete: boolean }>("/api/admin/setup"),
    retry: false,
  });
}

export function useAdminSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { password: string; confirmPassword: string }) =>
      adminFetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.session });
      qc.invalidateQueries({ queryKey: queryKeys.admin.setup });
    },
  });
}

// Login / Logout
export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { password: string }) =>
      adminFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.session });
    },
  });
}

export function useAdminLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminFetch("/api/admin/logout", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.session });
    },
  });
}

// Tenants
export function useAdminTenants() {
  return useQuery({
    queryKey: queryKeys.admin.tenants,
    queryFn: () => adminFetch<{ tenants: TenantResponse[] }>("/api/admin/tenants"),
  });
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.tenant(id),
    queryFn: () => adminFetch<{ tenant: TenantResponse }>(`/api/admin/tenants/${id}`),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      name: string;
      url: string;
      apiKey: string;
      enabled: boolean;
      enabledModuleGroups?: string[];
    }) =>
      adminFetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenants });
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      adminFetch(`/api/admin/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenants });
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenant(variables.id) });
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFetch(`/api/admin/tenants/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenants });
    },
  });
}

export function useTestTenantConnection() {
  return useMutation({
    mutationFn: (id: string) =>
      adminFetch<TestResult>(`/api/admin/tenants/${id}/test`, { method: "POST" }),
  });
}

// Settings
export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: () => adminFetch<{ settings: PlatformSettings }>("/api/admin/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PlatformSettings>) =>
      adminFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.settings });
    },
  });
}

// Password
export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      adminFetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

// Registrations
type RegistrationStatus =
  | "pending"
  | "approved"
  | "provisioning"
  | "active"
  | "rejected"
  | "failed";

interface RegistrationResponse {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  status: RegistrationStatus;
  rejectReason?: string;
  provisioningError?: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export function useAdminRegistrations() {
  return useQuery({
    queryKey: queryKeys.admin.registrations,
    queryFn: () =>
      adminFetch<{ registrations: RegistrationResponse[] }>("/api/admin/registrations"),
    refetchInterval: (query) => {
      const regs = query.state.data?.registrations;
      return regs?.some((r) => r.status === "provisioning") ? 5_000 : false;
    },
  });
}

export function useRegistrationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; action: "approve" | "reject"; rejectReason?: string }) => {
      const { id, ...body } = data;
      return adminFetch<{ ok: boolean; status: string; tenantId?: string }>(
        `/api/admin/registrations/${id}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.registrations });
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenants });
    },
  });
}

export function useDeleteRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFetch(`/api/admin/registrations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.registrations });
    },
  });
}
