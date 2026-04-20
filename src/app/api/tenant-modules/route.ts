import { NextRequest, NextResponse } from "next/server";
import { readConfig, configExists } from "@/lib/config-store";
import { isBillingActive, trialDaysRemaining } from "@/lib/billing/trial";

export async function GET(req: NextRequest) {
  const siteUrl = req.headers.get("x-frappe-site") ?? "";

  if (!siteUrl || !configExists()) {
    return NextResponse.json({ enabledModuleGroups: [] });
  }

  const config = readConfig();
  const tenant = config.tenants.find((t) => t.url === siteUrl);

  if (!tenant) {
    return NextResponse.json({ enabledModuleGroups: [] });
  }

  // If billing exists and is not active (trial expired, canceled, etc.), block modules
  if (tenant.billing && !isBillingActive(tenant.billing)) {
    return NextResponse.json({
      enabledModuleGroups: [],
      billingStatus: tenant.billing.status,
      trialExpired: true,
    });
  }

  return NextResponse.json({
    enabledModuleGroups: tenant.enabledModuleGroups ?? [],
    billingStatus: tenant.billing?.status ?? null,
    trialDaysRemaining: tenant.billing ? trialDaysRemaining(tenant.billing) : null,
  });
}
