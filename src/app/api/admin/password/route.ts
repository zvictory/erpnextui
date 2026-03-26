import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdminSession } from "@/lib/admin-auth-check";
import { readConfig, writeConfig } from "@/lib/config-store";
import { changePasswordSchema } from "@/lib/schemas/admin-schemas";

export async function PUT(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = changePasswordSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = result.data;
  const config = readConfig();

  const valid = await bcrypt.compare(currentPassword, config.superuser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  config.superuser.passwordHash = await bcrypt.hash(newPassword, 12);
  writeConfig(config);

  return NextResponse.json({ ok: true });
}
