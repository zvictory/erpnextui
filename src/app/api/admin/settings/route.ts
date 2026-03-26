import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth-check";
import { readConfig, writeConfig, getSettings } from "@/lib/config-store";
import { platformSettingsSchema } from "@/lib/schemas/admin-schemas";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  return NextResponse.json({ settings: getSettings() });
}

export async function PUT(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = platformSettingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const config = readConfig();
  config.settings = { ...config.settings, ...result.data };
  writeConfig(config);

  return NextResponse.json({ settings: config.settings });
}
