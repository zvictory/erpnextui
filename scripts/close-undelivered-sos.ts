/* eslint-disable no-console */
/**
 * Close every currently-open Sales Order whose items are ALL 0-delivered.
 *
 * Definition of "open":
 *   docstatus = 1 AND status NOT IN ('On Hold','Closed','Cancelled','Completed').
 *
 * Definition of "0-delivered":
 *   every child Sales Order Item row has delivered_qty = 0.
 *
 * Why this set: such SOs are stale promises against stock — they inflate
 * Bin.reserved_qty but no goods have moved. Closing them is the
 * ERPNext-sanctioned way to release the reservation (update_status triggers
 * update_reserved_qty server-side).
 *
 * SOs with any partially-delivered item are LEFT ALONE — they represent
 * real in-flight business and need a human decision.
 *
 * Default mode is DRY-RUN. Pass --yes to mutate.
 *
 * Outputs (gitignored via scripts/.out/):
 *   scripts/.out/close-undelivered-sos-<tenant>-<ISODATE>.plan.json
 *   scripts/.out/close-undelivered-sos-<tenant>-<ISODATE>.log.jsonl
 *
 * Usage:
 *   npx tsx scripts/close-undelivered-sos.ts --tenant=anjan
 *   npx tsx scripts/close-undelivered-sos.ts --tenant=anjan --yes
 */

import fs from "fs";
import path from "path";
import { getTenant } from "@/lib/config-store";

const OPEN_SO_STATUSES_EXCLUDED = ["On Hold", "Closed", "Cancelled", "Completed"];

interface Args {
  tenant: string;
  yes: boolean;
}

function parseArgs(): Args {
  const arg = (n: string) =>
    process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
  const has = (n: string) => process.argv.includes(`--${n}`);
  const tenant = arg("tenant");
  if (!tenant) {
    console.error("Usage: tsx scripts/close-undelivered-sos.ts --tenant=<id> [--yes]");
    process.exit(1);
  }
  return { tenant, yes: has("yes") };
}

interface ErpClient {
  get: <T>(endpoint: string) => Promise<T>;
  post: <T>(endpoint: string, body: unknown) => Promise<T>;
}

function makeErp(tenantUrl: string, apiKey: string): ErpClient {
  const base = tenantUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `token ${apiKey}`,
    "Content-Type": "application/json",
  };
  async function call<T>(method: "GET" | "POST", endpoint: string, body?: unknown): Promise<T> {
    const resp = await fetch(`${base}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`ERPNext ${method} ${endpoint} → HTTP ${resp.status}: ${text.slice(0, 400)}`);
    }
    return (await resp.json()) as T;
  }
  return {
    get: <T>(endpoint: string) => call<T>("GET", endpoint),
    post: <T>(endpoint: string, body: unknown) => call<T>("POST", endpoint, body),
  };
}

interface SoSummary {
  name: string;
  status: string;
  transaction_date: string;
}

interface SoDoc {
  name: string;
  status: string;
  transaction_date: string;
  items: Array<{
    item_code: string;
    warehouse: string;
    qty: number;
    stock_qty: number;
    delivered_qty: number;
  }>;
}

async function paginate<T>(
  erp: ErpClient,
  doctype: string,
  filters: unknown[],
  fields: string[],
  orderBy = "creation asc,name asc",
): Promise<T[]> {
  const pageSize = 500;
  let start = 0;
  const out: T[] = [];
  for (;;) {
    const qs = new URLSearchParams({
      filters: JSON.stringify(filters),
      fields: JSON.stringify(fields),
      order_by: orderBy,
      limit_page_length: String(pageSize),
      limit_start: String(start),
    });
    const resp = await erp.get<{ data: T[] }>(
      `/api/resource/${encodeURIComponent(doctype)}?${qs}`,
    );
    if (!resp.data.length) break;
    out.push(...resp.data);
    if (resp.data.length < pageSize) break;
    start += pageSize;
  }
  return out;
}

async function fetchOpenSos(erp: ErpClient): Promise<SoSummary[]> {
  return paginate<SoSummary>(
    erp,
    "Sales Order",
    [
      ["docstatus", "=", 1],
      ["status", "not in", OPEN_SO_STATUSES_EXCLUDED],
    ],
    ["name", "status", "transaction_date"],
  );
}

async function fetchSoDoc(erp: ErpClient, name: string): Promise<SoDoc> {
  const resp = await erp.get<{ data: SoDoc }>(
    `/api/resource/Sales%20Order/${encodeURIComponent(name)}`,
  );
  return resp.data;
}

async function classifyAll(
  erp: ErpClient,
  summaries: SoSummary[],
): Promise<{
  fullyUndelivered: SoDoc[];
  partiallyDelivered: SoDoc[];
  fullyDelivered: SoDoc[];
}> {
  const fullyUndelivered: SoDoc[] = [];
  const partiallyDelivered: SoDoc[] = [];
  const fullyDelivered: SoDoc[] = [];
  const concurrency = 6;
  let idx = 0;
  let done = 0;
  async function worker() {
    while (idx < summaries.length) {
      const my = idx++;
      const doc = await fetchSoDoc(erp, summaries[my].name);
      const items = doc.items ?? [];
      const anyDelivered = items.some((it) => (it.delivered_qty ?? 0) > 0);
      const anyUndelivered = items.some((it) => (it.delivered_qty ?? 0) < (it.qty ?? 0));
      if (!anyUndelivered) {
        fullyDelivered.push(doc);
      } else if (!anyDelivered) {
        fullyUndelivered.push(doc);
      } else {
        partiallyDelivered.push(doc);
      }
      done++;
      if (done % 25 === 0 || done === summaries.length) {
        console.log(`  [classify ${done}/${summaries.length}]`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { fullyUndelivered, partiallyDelivered, fullyDelivered };
}

async function closeSo(erp: ErpClient, name: string): Promise<void> {
  await erp.post(`/api/method/erpnext.selling.doctype.sales_order.sales_order.update_status`, {
    name,
    status: "Closed",
  });
}

interface LogEntry {
  name: string;
  status: "success" | "failed";
  reason?: string;
  durationMs: number;
  ts: string;
}

async function main() {
  const args = parseArgs();
  const tenant = getTenant(args.tenant);
  if (!tenant) {
    console.error(`Tenant not found: ${args.tenant}`);
    process.exit(1);
  }
  console.log(`Tenant: ${tenant.id} (${tenant.url})  mode: ${args.yes ? "EXECUTE" : "DRY-RUN"}`);

  const erp = makeErp(tenant.url, tenant.apiKey);

  const outDir = path.join(process.cwd(), "scripts", ".out");
  fs.mkdirSync(outDir, { recursive: true });
  const isoDate = new Date().toISOString().slice(0, 10);
  const planPath = path.join(outDir, `close-undelivered-sos-${tenant.id}-${isoDate}.plan.json`);
  const logPath = path.join(outDir, `close-undelivered-sos-${tenant.id}-${isoDate}.log.jsonl`);

  console.log("Fetching open Sales Orders ...");
  const summaries = await fetchOpenSos(erp);
  console.log(`  open SOs: ${summaries.length}`);

  console.log("Classifying (fetching child items per SO) ...");
  const { fullyUndelivered, partiallyDelivered, fullyDelivered } = await classifyAll(
    erp,
    summaries,
  );
  console.log(`  fully undelivered (will close): ${fullyUndelivered.length}`);
  console.log(`  partially delivered (skip):     ${partiallyDelivered.length}`);
  console.log(`  fully delivered, To-Bill (skip): ${fullyDelivered.length}`);

  const plan = {
    tenant: tenant.id,
    generatedAt: new Date().toISOString(),
    mode: args.yes ? "execute" : "dry-run",
    summary: {
      openSoCount: summaries.length,
      fullyUndelivered: fullyUndelivered.length,
      partiallyDelivered: partiallyDelivered.length,
      fullyDelivered: fullyDelivered.length,
    },
    fullyUndelivered: fullyUndelivered.map((d) => ({
      name: d.name,
      status: d.status,
      transaction_date: d.transaction_date,
      lineCount: (d.items ?? []).length,
      totalStockQty: (d.items ?? []).reduce((s, it) => s + (it.stock_qty ?? 0), 0),
    })),
    partiallyDelivered: partiallyDelivered.map((d) => ({
      name: d.name,
      status: d.status,
      transaction_date: d.transaction_date,
    })),
  };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(`Plan written: ${planPath}`);

  if (fullyUndelivered.length > 0) {
    console.log("\nSample of SOs to close:");
    for (const d of fullyUndelivered.slice(0, 5)) {
      const total = (d.items ?? []).reduce((s, it) => s + (it.stock_qty ?? 0), 0);
      console.log(
        `  ${d.name}  ${d.transaction_date}  status=${d.status}  lines=${(d.items ?? []).length}  total_stock_qty=${total}`,
      );
    }
  }

  if (!args.yes) {
    console.log("\nDRY-RUN complete. Re-run with --yes to execute.");
    return;
  }

  console.log(`\nClosing ${fullyUndelivered.length} SOs ...`);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < fullyUndelivered.length; i++) {
    const d = fullyUndelivered[i];
    const t0 = Date.now();
    try {
      await closeSo(erp, d.name);
      ok++;
      const entry: LogEntry = {
        name: d.name,
        status: "success",
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      fail++;
      const entry: LogEntry = {
        name: d.name,
        status: "failed",
        reason: (err as Error).message,
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    }
    if ((i + 1) % 10 === 0 || i === fullyUndelivered.length - 1) {
      console.log(`  [close ${i + 1}/${fullyUndelivered.length}]  ok=${ok} fail=${fail}`);
    }
  }

  console.log("\nVerifying post-state ...");
  const dirtyBins = await paginate<{ name: string }>(
    erp,
    "Bin",
    [["reserved_qty", "!=", 0]],
    ["name"],
  );
  console.log(`  bins with reserved_qty != 0 (after): ${dirtyBins.length}`);

  console.log("\n── Done ──");
  console.log(`  Closed:  ${ok} ok, ${fail} failed`);
  console.log(`  Log:     ${logPath}`);
  console.log(`  Plan:    ${planPath}`);

  if (fail > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
