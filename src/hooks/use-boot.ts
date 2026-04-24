"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { Company, Currency } from "@/types/company";
import type { DoctypePermissions } from "@/lib/permissions";

export interface BootUser {
  name: string;
  email: string;
  full_name: string;
  language: string;
  time_zone: string | null;
  roles: string[];
}

export interface BootSysDefaults {
  currency: string | null;
  date_format: string | null;
  number_format: string | null;
  float_precision: string | null;
  currency_precision: string | null;
  country: string | null;
}

export interface BootPayload {
  user: BootUser;
  companies: Company[];
  default_company: string | null;
  sysdefaults: BootSysDefaults;
  currencies: Currency[];
  permissions: Record<string, DoctypePermissions>;
}

export const BOOT_QUERY_KEY = ["boot"] as const;

function seedCache(qc: QueryClient, boot: BootPayload) {
  // Mirror the single boot payload into the per-feature query cache so hooks
  // that mount later (useSessionCheck, useCompanies, useCurrencies,
  // usePermissions, etc.) get instant cache hits and skip their round-trips.
  qc.setQueryData(queryKeys.auth.session, boot.user.email);
  qc.setQueryData(queryKeys.auth.fullName(boot.user.email), boot.user.full_name);
  qc.setQueryData(queryKeys.companies.all, boot.companies);
  qc.setQueryData(queryKeys.currencies, boot.currencies);
  qc.setQueryData(queryKeys.permissions.all(boot.user.email), boot.permissions);
}

export function useBoot() {
  const qc = useQueryClient();

  // Boot acts as both the auth probe and the bulk data seeder. It fires
  // unconditionally on mount — if the session is invalid the call returns
  // 401/403 and the AuthGuard redirects to /login just like the legacy
  // session check did.
  const query = useQuery({
    queryKey: BOOT_QUERY_KEY,
    queryFn: () => frappe.call<BootPayload>("frappe.stable_erp_api.get_boot"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!query.data) return;
    seedCache(qc, query.data);
    const authStore = useAuthStore.getState();
    if (query.data.user.email && authStore.user !== query.data.user.email) {
      authStore.setUser(query.data.user.email);
    }
    if (query.data.user.full_name && authStore.fullName !== query.data.user.full_name) {
      authStore.setFullName(query.data.user.full_name);
    }
  }, [query.data, qc]);

  return query;
}
