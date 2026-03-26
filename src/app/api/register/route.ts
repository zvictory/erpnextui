import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readConfig, writeConfig, encryptPassword } from "@/lib/config-store";
import { registrationSchema } from "@/lib/schemas/admin-schemas";
import { checkRegistrationRateLimit, recordRegistration } from "@/lib/registration-rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  const rl = checkRegistrationRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Слишком много заявок. Попробуйте позже.",
        retryAfterMs: rl.retryAfterMs,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = registrationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { companyName, email, password, phone, country, currency } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  const config = readConfig();

  // Check duplicate email in non-rejected registrations
  const existingReg = config.registrations.find(
    (r) => r.email === normalizedEmail && r.status !== "rejected",
  );
  if (existingReg) {
    return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 409 });
  }

  // Check duplicate email in existing tenants (by checking all tenant URLs for this email)
  // We can't check email in tenants directly since tenants don't store emails,
  // but we check active registrations above which link to tenants

  const now = new Date().toISOString();
  const registration = {
    id: crypto.randomUUID(),
    companyName,
    email: normalizedEmail,
    encryptedPassword: encryptPassword(password),
    phone,
    country,
    currency,
    status: "pending" as const,
    createdAt: now,
    updatedAt: now,
  };

  config.registrations.push(registration);
  writeConfig(config);
  recordRegistration(ip);

  return NextResponse.json({ ok: true });
}
