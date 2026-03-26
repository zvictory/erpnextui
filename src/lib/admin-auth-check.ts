// Server-only module — shared helper for protected admin API routes

import { NextResponse } from "next/server";
import { getSessionIdFromCookie, validateSession } from "./admin-session";

export async function requireAdminSession(): Promise<
  { authorized: true } | { authorized: false; response: NextResponse }
> {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId || !validateSession(sessionId)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { authorized: true };
}
