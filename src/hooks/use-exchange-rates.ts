"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { frappe } from "@/lib/frappe-client";
import { useAuthStore } from "@/stores/auth-store";
import { useCompanyStore } from "@/stores/company-store";

interface CBURatesResponse {
  rates: Record<string, number>;
  date: string;
  error?: string;
}

interface SyncResponse {
  synced: string[];
  skipped: string[];
  errors: string[];
  date: string;
}

export function useCBURates() {
  // queryFn returns the raw response (JSON-safe for the localStorage
  // persister); Map is rebuilt at the consumer boundary. `select`-produced
  // Maps look fine on first load but rehydrate as `{}` from persisted cache.
  const query = useQuery({
    queryKey: queryKeys.cbuRates,
    queryFn: async () => {
      const resp = await fetch("/api/cbu-rates");
      if (!resp.ok) throw new Error("Failed to fetch CBU rates");
      return resp.json() as Promise<CBURatesResponse>;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
  const ratesMap = useMemo(
    () => new Map<string, number>(Object.entries(query.data?.rates ?? {})),
    [query.data],
  );
  return { ...query, data: ratesMap };
}

const SYNC_KEY = "cbu-last-sync-date";

export function useRateSync() {
  const triggered = useRef(false);
  const { siteUrl, csrfToken } = useAuthStore();
  const { company, currencyCode } = useCompanyStore();
  // Fetch unique account currencies directly to avoid circular dependency with use-accounts
  const { data: accountCurrencies } = useQuery({
    queryKey: ["accountCurrencies", company],
    queryFn: async () => {
      const accounts = await frappe.getList<{ account_currency: string }>("Account", {
        filters: [
          ["is_group", "=", 0],
          ["disabled", "=", 0],
          ["company", "=", company],
        ],
        fields: ["account_currency"],
        limitPageLength: 0,
      });
      return [...new Set(accounts.map((a) => a.account_currency).filter(Boolean))];
    },
    enabled: !!company,
    staleTime: 10 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: async (currencies: string[]) => {
      const resp = await fetch("/api/sync-rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ siteUrl, currencies }),
      });
      if (!resp.ok) throw new Error("Sync failed");
      return resp.json() as Promise<SyncResponse>;
    },
    onSuccess: (data) => {
      if (data.synced.length > 0) {
        localStorage.setItem(SYNC_KEY, data.date);
      }
    },
  });

  useEffect(() => {
    if (triggered.current || !siteUrl || !company || !currencyCode || !accountCurrencies) return;

    const foreignCurrencies = accountCurrencies.filter((c) => c !== currencyCode);

    if (foreignCurrencies.length === 0) return;

    const lastSync = localStorage.getItem(SYNC_KEY);
    const today = new Date().toISOString().slice(0, 10);

    if (lastSync === today) return;

    triggered.current = true;
    syncMutation.mutate(foreignCurrencies);
  }, [siteUrl, company, currencyCode, accountCurrencies, syncMutation]);

  return syncMutation;
}
