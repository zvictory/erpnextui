"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { Persister } from "@tanstack/query-persist-client-core";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { FrappeAPIError } from "@/lib/frappe-types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      // PersistQueryClientProvider dehydrates from the in-memory cache. gcTime
      // must be at least as long as maxAge, or queries get garbage-collected
      // before persistence can read them.
      gcTime: 24 * 60 * 60 * 1000,
    },
    mutations: {
      onError: (error) => {
        if (error instanceof FrappeAPIError && error.status === 403) {
          toast.error("You don't have permission to perform this action");
        }
      },
    },
  },
});

// Root keys that must never land in localStorage. Session + permissions are
// tenant-scoped and short-lived; persisting them would leak across tenants on
// first paint after logout/login.
const PERSIST_DENYLIST = new Set(["auth", "permissions", "boot"]);

export const PERSIST_KEY = "erpnext-rq-cache";

let cachedPersister: Persister | null = null;

export function getQueryPersister(): Persister | null {
  if (typeof window === "undefined") return null;
  if (cachedPersister) return cachedPersister;
  cachedPersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: PERSIST_KEY,
    throttleTime: 1000,
  });
  return cachedPersister;
}

const noopSubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function QueryProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore gives a clean SSR/client split: server renders
  // `mounted = false`, client's first render also `false` (so hydration
  // matches), then client flips to `true` and we mount the persistence layer
  // around the same singleton queryClient.
  const mounted = useSyncExternalStore(noopSubscribe, getClientSnapshot, getServerSnapshot);
  const persister: Persister | null = mounted ? getQueryPersister() : null;

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const [root] = query.queryKey as [string, ...unknown[]];
            if (typeof root === "string" && PERSIST_DENYLIST.has(root)) return false;
            return query.state.status === "success";
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
