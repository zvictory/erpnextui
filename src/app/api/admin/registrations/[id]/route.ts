import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth-check";
import { readConfig, writeConfig } from "@/lib/config-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const config = readConfig();
  const reg = config.registrations.find((r) => r.id === id);

  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const { encryptedPassword: _, ...safe } = reg;
  return NextResponse.json({ registration: safe });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const config = readConfig();
  const idx = config.registrations.findIndex((r) => r.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  config.registrations.splice(idx, 1);
  writeConfig(config);

  return NextResponse.json({ ok: true });
}
