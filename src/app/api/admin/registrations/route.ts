import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth-check";
import { readConfig } from "@/lib/config-store";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const config = readConfig();
  const registrations = [...config.registrations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ encryptedPassword: _, ...rest }) => rest);

  return NextResponse.json({ registrations });
}
