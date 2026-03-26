import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth-check";
import { readConfig, writeConfig, maskApiKey } from "@/lib/config-store";
import { tenantUpdateSchema } from "@/lib/schemas/admin-schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const config = readConfig();
  const tenant = config.tenants.find((t) => t.id === id);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ tenant: { ...tenant, apiKey: maskApiKey(tenant.apiKey) } });
}

export async function PUT(req: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = tenantUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const config = readConfig();
  const idx = config.tenants.findIndex((t) => t.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const updates = result.data;
  config.tenants[idx] = {
    ...config.tenants[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeConfig(config);

  const updated = config.tenants[idx];
  return NextResponse.json({ tenant: { ...updated, apiKey: maskApiKey(updated.apiKey) } });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const config = readConfig();
  const idx = config.tenants.findIndex((t) => t.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  config.tenants.splice(idx, 1);
  writeConfig(config);

  return NextResponse.json({ ok: true });
}
