import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isSetupComplete, readConfig } from "@/lib/config-store";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  createSession,
  setSessionCookie,
} from "@/lib/admin-session";
import { loginSchema } from "@/lib/schemas/admin-schemas";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  if (!isSetupComplete()) {
    return NextResponse.json({ error: "Setup not complete" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later.", retryAfterMs: rateCheck.retryAfterMs },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const { password } = result.data;
  const config = readConfig();
  const valid = await bcrypt.compare(password, config.superuser.passwordHash);

  if (!valid) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  clearAttempts(ip);
  const sessionId = createSession();
  await setSessionCookie(sessionId);

  return NextResponse.json({ ok: true });
}
