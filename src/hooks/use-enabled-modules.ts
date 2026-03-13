"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { ModuleGroupKey } from "@/lib/module-groups";

interface TenantModulesResponse {
  enabledModuleGroups: string[];
}

export function useEnabledModules() {
  const siteUrl = useAuthStore((s) => s.siteUrl);

  const { data } = useQuery({
    queryKey: queryKeys.enabledModules.current(siteUrl),
    queryFn: async (): Promise<ModuleGroupKey[]> => {
      const resp = await fetch("/api/tenant-modules", {
        headers: { "x-frappe-site": siteUrl },
      });
      if (!resp.ok) return [];
      const json: TenantModulesResponse = await resp.json();
      return (json.enabledModuleGroups ?? []) as ModuleGroupKey[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!siteUrl,
  });

  return data;
}
