import { NextResponse } from "next/server";
import { resolveAuthContext } from "@/lib/permissions/resolve-context";
import { PermissionResolutionError } from "@/lib/permissions/errors";

export type GrantsResponse = {
  user: string;
  tenant: string;
  isSuperuser: boolean;
  capabilities: string[];
  allowedScopes: Record<string, string[]>;
};

export async function GET() {
  try {
    const ctx = await resolveAuthContext();

    const allowedScopes: Record<string, string[]> = {};
    for (const [dim, set] of Object.entries(ctx.allowedScopes)) {
      allowedScopes[dim] = [...set];
    }

    const body: GrantsResponse = {
      user: ctx.user,
      tenant: ctx.tenant,
      isSuperuser: ctx.isSuperuser,
      capabilities: [...ctx.grantedCapabilities],
      allowedScopes,
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof PermissionResolutionError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load grants" },
      { status: 500 },
    );
  }
}
