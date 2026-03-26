import { NextResponse } from "next/server";
import { getSessionIdFromCookie, validateSession } from "@/lib/admin-session";
import { isSetupComplete } from "@/lib/config-store";

export async function GET() {
  const setupComplete = isSetupComplete();
  if (!setupComplete) {
    return NextResponse.json({ valid: false, setupComplete: false });
  }

  const sessionId = await getSessionIdFromCookie();
  const valid = !!sessionId && validateSession(sessionId);

  return NextResponse.json({ valid, setupComplete: true });
}
