"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { frappeCall, fetchCsrfToken } from "@/lib/frappe-client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/hooks/query-keys";
import { FrappeAPIError } from "@/lib/frappe-types";
import { clearTenantState } from "@/lib/clear-tenant-state";

interface LoginCredentials {
  siteUrl: string;
  usr: string;
  pwd: string;
}

interface LoginResponse {
  message: string;
  home_page?: string;
  full_name?: string;
}

interface SessionResponse {
  message: string;
}

export { fetchCsrfToken } from "@/lib/frappe-client";

export function useSessionCheck() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async () => {
      const data = await frappeCall<SessionResponse>("/api/method/frappe.auth.get_logged_user");
      return data.message;
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useFullName(email: string | null) {
  return useQuery({
    queryKey: queryKeys.auth.fullName(email ?? ""),
    queryFn: async () => {
      const data = await frappeCall<{ message: { full_name?: string } }>(
        "/api/method/frappe.client.get_value",
        {
          method: "POST",
          body: JSON.stringify({
            doctype: "User",
            filters: { name: email },
            fieldname: "full_name",
          }),
        },
      );
      return data.message?.full_name || email || "";
    },
    enabled: !!email,
    staleTime: Infinity,
  });
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const setSiteUrl = useAuthStore((s) => s.setSiteUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ siteUrl, usr, pwd }: LoginCredentials) => {
      const resp = await fetch("/api/proxy/api/method/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Frappe-Site": siteUrl },
        body: JSON.stringify({ usr, pwd }),
      });

      if (!resp.ok) {
        let message = "Invalid credentials";
        try {
          const json = await resp.json();
          message = json.message || json.exc || message;
        } catch {
          // body wasn't JSON
        }
        throw new FrappeAPIError(message, resp.status);
      }

      const data: LoginResponse = await resp.json();
      return { ...data, siteUrl };
    },
    onSuccess: async (data) => {
      clearTenantState();
      setSiteUrl(data.siteUrl);
      setUser(data.message); // email
      if (data.full_name) {
        useAuthStore.getState().setFullName(data.full_name);
      }
      await fetchCsrfToken();
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    },
  });
}
