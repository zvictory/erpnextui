import { type NextRequest, NextResponse } from "next/server";
import { Agent, setGlobalDispatcher } from "undici";

// Shared keep-alive pool for upstream ERPNext fetches. Without this, every
// /api/proxy request opens a fresh TLS connection to {tenant}.erpstable.com
// (~30-80ms handshake). With keep-alive, the same socket is reused across
// requests, dropping TTFB by that amount under any sustained load.
// `setGlobalDispatcher` makes `fetch()` in this Node runtime use the pool.
declare global {
  var __erpUpstreamAgent: Agent | undefined;
}
if (!globalThis.__erpUpstreamAgent) {
  globalThis.__erpUpstreamAgent = new Agent({
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 60_000,
    connections: 32,
  });
  setGlobalDispatcher(globalThis.__erpUpstreamAgent);
}

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

  // Trim trailing slash so `siteUrl` ending in `/` doesn't produce `//api/...`
  // (Frappe tolerates but logs it; nginx/upstream proxies may reject.)
  const base = siteUrl.replace(/\/+$/, "");
  const targetUrl = `${base}/${path.join("/")}${req.nextUrl.search}`;

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

  // Stream the response by default — TTFB drops to whatever upstream sends first,
  // and large reports/exports don't sit in Node memory. We only buffer on 5xx,
  // where we need the body to log. 4xx are normal upstream signals (404 for missing
  // docs, 403 for permission denied, 417 for ERPNext info messages) — don't log them.
  let upstreamBody: BodyInit | null = upstream.body;
  if (upstream.status >= 500) {
    const buf = await upstream.arrayBuffer();
    upstreamBody = buf;
    console.warn(
      "[proxy] upstream 5xx",
      req.method,
      targetUrl,
      upstream.status,
      new TextDecoder().decode(buf).slice(0, 500),
    );
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
