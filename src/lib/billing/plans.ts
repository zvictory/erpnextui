import { type ModuleGroupKey, ALL_MODULE_GROUP_KEYS } from "@/lib/module-groups";
import type { BillingPlan } from "@/lib/config-store";

export interface PlanDefinition {
  id: BillingPlan;
  label: string;
  priceUsd: number;
  priceUzs: number;
  modules: ModuleGroupKey[];
}

export const PLAN_DEFINITIONS: Record<BillingPlan, PlanDefinition> = {
  starter: {
    id: "starter",
    label: "Старт",
    priceUsd: 50,
    priceUzs: 650_000,
    modules: ["main", "master-data", "transactions", "stock"],
  },
  pro: {
    id: "pro",
    label: "Про",
    priceUsd: 120,
    priceUzs: 1_550_000,
    modules: ["main", "master-data", "transactions", "stock", "accounting", "reports", "warehouse"],
  },
  enterprise: {
    id: "enterprise",
    label: "Бизнес",
    priceUsd: 200,
    priceUzs: 2_600_000,
    modules: [...ALL_MODULE_GROUP_KEYS],
  },
};

export function getModulesForPlan(plan: BillingPlan): ModuleGroupKey[] {
  return PLAN_DEFINITIONS[plan].modules;
}

export const TRIAL_DURATION_DAYS = 14;

export function createTrialEndsAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + TRIAL_DURATION_DAYS);
  return date.toISOString();
}
