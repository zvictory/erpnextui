import { NextRequest, NextResponse } from "next/server";
import { readConfig, configExists } from "@/lib/config-store";
import { isBillingActive, trialDaysRemaining } from "@/lib/billing/trial";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";

export async function GET(req: NextRequest) {
  const siteUrl = req.headers.get("x-frappe-site") ?? "";

  if (!siteUrl || !configExists()) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const config = readConfig();
  const tenant = config.tenants.find((t) => t.url === siteUrl);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (!tenant.billing) {
    return NextResponse.json({
      plan: null,
      status: null,
      active: true,
      trialDaysRemaining: null,
      planLabel: null,
    });
  }

  const { billing } = tenant;
  const planDef = PLAN_DEFINITIONS[billing.plan];

  return NextResponse.json({
    plan: billing.plan,
    status: billing.status,
    active: isBillingActive(billing),
    trialDaysRemaining: trialDaysRemaining(billing),
    trialEndsAt: billing.trialEndsAt,
    planLabel: planDef?.label ?? billing.plan,
    currentPeriodEnd: billing.currentPeriodEnd ?? null,
  });
}
