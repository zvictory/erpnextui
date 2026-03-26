import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isSetupComplete, readConfig, writeConfig } from "@/lib/config-store";
import { createSession, setSessionCookie } from "@/lib/admin-session";
import { setupSchema } from "@/lib/schemas/admin-schemas";

export async function POST(req: Request) {
  if (isSetupComplete()) {
    return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = setupSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { password } = result.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const config = readConfig();
  config.superuser.passwordHash = passwordHash;
  writeConfig(config);

  // Auto-login after setup
  const sessionId = createSession();
  await setSessionCookie(sessionId);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ setupComplete: isSetupComplete() });
}
