import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth-check";
import { readConfig, writeConfig, maskApiKey } from "@/lib/config-store";
import { tenantSchema } from "@/lib/schemas/admin-schemas";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const config = readConfig();
  const tenants = config.tenants.map((t) => ({
    ...t,
    apiKey: maskApiKey(t.apiKey),
  }));

  return NextResponse.json({ tenants });
}

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = tenantSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const tenant = result.data;
  const config = readConfig();

  if (config.tenants.some((t) => t.id === tenant.id)) {
    return NextResponse.json({ error: "Tenant with this slug already exists" }, { status: 409 });
  }

  const now = new Date().toISOString();
  config.tenants.push({
    ...tenant,
    createdAt: now,
    updatedAt: now,
  });
  writeConfig(config);

  return NextResponse.json(
    { tenant: { ...tenant, apiKey: maskApiKey(tenant.apiKey), createdAt: now, updatedAt: now } },
    { status: 201 },
  );
}
