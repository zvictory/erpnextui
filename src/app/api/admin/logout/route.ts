import { NextResponse } from "next/server";
import { getSessionIdFromCookie, destroySession, clearSessionCookie } from "@/lib/admin-session";

export async function POST() {
  const sessionId = await getSessionIdFromCookie();
  if (sessionId) {
    destroySession(sessionId);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
