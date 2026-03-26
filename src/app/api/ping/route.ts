import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const resp = await fetch(`${url}/api/method/frappe.ping`, {
      headers: { Accept: "application/json" },
    });
    if (resp.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, status: resp.status }, { status: resp.status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Network error" },
      { status: 502 },
    );
  }
}
