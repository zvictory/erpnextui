"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { BillingPlan, BillingStatus } from "@/lib/config-store";

export interface BillingStatusResponse {
  plan: BillingPlan | null;
  status: BillingStatus | null;
  active: boolean;
  trialDaysRemaining: number | null;
  trialEndsAt: string | null;
  planLabel: string | null;
  currentPeriodEnd: string | null;
}

export function useBillingStatus() {
  const siteUrl = useAuthStore((s) => s.siteUrl);

  return useQuery({
    queryKey: queryKeys.billing.status(siteUrl),
    queryFn: async (): Promise<BillingStatusResponse> => {
      const resp = await fetch("/api/billing/status", {
        headers: { "x-frappe-site": siteUrl },
      });
      if (!resp.ok) {
        return {
          plan: null,
          status: null,
          active: true,
          trialDaysRemaining: null,
          trialEndsAt: null,
          planLabel: null,
          currentPeriodEnd: null,
        };
      }
      return resp.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!siteUrl,
  });
}
