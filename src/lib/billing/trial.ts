import type { BillingInfo } from "@/lib/config-store";

export function isTrialExpired(billing: BillingInfo): boolean {
  if (billing.status !== "trial") return false;
  return new Date(billing.trialEndsAt) < new Date();
}

export function trialDaysRemaining(billing: BillingInfo): number {
  if (billing.status !== "trial") return 0;
  const diff = new Date(billing.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isBillingActive(billing?: BillingInfo): boolean {
  if (!billing) return true; // no billing info = legacy tenant, allow access
  if (billing.status === "grandfathered") return true;
  if (billing.status === "active") return true;
  if (billing.status === "trial") return !isTrialExpired(billing);
  return false; // past_due, canceled
}
