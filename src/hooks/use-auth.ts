"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { frappeCall } from "@/lib/frappe-client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/hooks/query-keys";
import { FrappeAPIError } from "@/lib/frappe-types";

interface LoginCredentials {
  usr: string;
  pwd: string;
}

interface LoginResponse {
  message: string;
  home_page: string;
  full_name: string;
}

interface SessionResponse {
  message: string;
}

export async function fetchCsrfToken(): Promise<void> {
  // First check if the CSRF token is already available in cookies
  const cookieMatch = document.cookie.match(/csrf_token=([^;]+)/);
  if (cookieMatch?.[1]) {
    useAuthStore.getState().setCsrfToken(cookieMatch[1]);
    return;
  }

  // Otherwise, fetch the /app page and parse the CSRF token from the HTML
  const resp = await fetch("/app", { credentials: "include" });
  const html = await resp.text();
  const tokenMatch = html.match(/csrf_token\s*=\s*"([a-f0-9]+)"/);
  if (tokenMatch?.[1]) {
    useAuthStore.getState().setCsrfToken(tokenMatch[1]);
  }
}

export function useSessionCheck() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async () => {
      const data = await frappeCall<SessionResponse>(
        "/api/method/frappe.auth.get_logged_user",
      );
      return data.message;
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const resp = await fetch("/api/method/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!resp.ok) {
        const body = await resp.text();
        let message = "Login failed";
        try {
          const json = JSON.parse(body);
          message = json.message || json.exc || message;
        } catch {
          // body wasn't JSON
        }
        throw new FrappeAPIError(message, resp.status);
      }

      const data: LoginResponse = await resp.json();
      return data;
    },
    onSuccess: async (data) => {
      setUser(data.full_name || data.message);
      await fetchCsrfToken();
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    },
  });
}
