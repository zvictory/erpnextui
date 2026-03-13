import { NextRequest, NextResponse } from "next/server";
import { readConfig, configExists } from "@/lib/config-store";

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

  return NextResponse.json({
    enabledModuleGroups: tenant.enabledModuleGroups ?? [],
  });
}
