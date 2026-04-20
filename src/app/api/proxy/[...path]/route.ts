import { type NextRequest, NextResponse } from "next/server";

const DROP_REQ = new Set([
  "host",
  "x-frappe-site",
  "connection",
  "transfer-encoding",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "expect", // prevent 417 from werkzeug/gunicorn
  "content-length", // let Node.js fetch recompute from the ArrayBuffer
  "origin", // proxy is server-to-server; foreign origin confuses Frappe
  "referer", // same reason
  "accept-encoding", // force upstream to send uncompressed; avoids ERR_CONTENT_DECODING_FAILED
]);

const DROP_RESP = new Set([
  "connection",
  "transfer-encoding",
  "content-encoding",
  "link", // ERPNext sends Link preload headers for its bundles; the browser would try to fetch them from localhost and 404
]);

/** Strip Domain; strip Secure and SameSite=None on HTTP so localhost works */
function rewriteSetCookie(cookie: string, isHttps: boolean): string {
  const parts = cookie
    .split(";")
    .map((p) => p.trim())
    .filter((p) => {
      const l = p.toLowerCase();
      if (l.startsWith("domain=")) return false;
      if (l === "secure" && !isHttps) return false;
      if (l === "samesite=none" && !isHttps) return false;
      return true;
    });
  // SameSite=None requires Secure — on HTTP we stripped both, so add Lax as fallback
  if (!isHttps && !parts.some((p) => p.toLowerCase().startsWith("samesite="))) {
    parts.push("SameSite=Lax");
  }
  return parts.join("; ");
}

async function handle(req: NextRequest, path: string[]): Promise<NextResponse> {
  const siteUrl = req.headers.get("x-frappe-site");
  if (!siteUrl) {
    return NextResponse.json({ error: "Missing X-Frappe-Site header" }, { status: 400 });
  }

  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");

  const targetUrl = `${siteUrl}/${path.join("/")}${req.nextUrl.search}`;

  const forwardHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!DROP_REQ.has(key.toLowerCase())) forwardHeaders.set(key, value);
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream unreachable" },
      { status: 502 },
    );
  }

  const respHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    const l = key.toLowerCase();
    if (DROP_RESP.has(l) || l === "set-cookie") continue;
    respHeaders.set(key, value);
  }

  // Rewrite each Set-Cookie so the browser stores it for localhost
  const cookies =
    typeof (upstream.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie ===
    "function"
      ? (upstream.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [upstream.headers.get("set-cookie") ?? ""].filter(Boolean);

  for (const c of cookies) {
    respHeaders.append("set-cookie", rewriteSetCookie(c, isHttps));
  }

  const upstreamBody = await upstream.arrayBuffer();
  if (upstream.status >= 400) {
    // 417 is expected when custom batch methods (stable_erp_api.*) aren't deployed — frontend has fallbacks
    if (upstream.status !== 417) {
      console.error(
        "[proxy] upstream error",
        req.method,
        targetUrl,
        upstream.status,
        new TextDecoder().decode(upstreamBody),
      );
    }
  }

  // Add Cache-Control for successful GET responses
  if (req.method === "GET" && upstream.status >= 200 && upstream.status < 300) {
    const joinedPath = path.join("/");
    if (
      joinedPath.startsWith("api/resource/Currency") ||
      joinedPath.startsWith("api/resource/Account") ||
      joinedPath.startsWith("api/resource/Company")
    ) {
      respHeaders.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    } else if (joinedPath.startsWith("api/method/")) {
      respHeaders.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    } else {
      respHeaders.set("Cache-Control", "private, max-age=60");
    }
  }

  // Separate browser cache entries per tenant so cross-tenant logins never serve stale data
  respHeaders.set("Vary", "X-Frappe-Site");

  return new NextResponse(upstreamBody, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(req, (await params).path);
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(req, (await params).path);
}
export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(req, (await params).path);
}
