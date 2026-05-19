/* eslint-disable no-console */
/**
 * Repair stale Bin.reserved_qty rows.
 *
 * Background: ERPNext keeps Bin.reserved_qty in sync via update_reserved_qty().
 * That sync can be skipped when SREs are deleted in bulk after their source
 * SOs have already moved to Delivered/Closed. The result is a Bin row whose
 * reserved_qty no longer corresponds to any live SO Item or SRE — the UI
 * faithfully reports negative availability based on the stale value.
 *
 * What this does:
 *   For every Bin row with reserved_qty != 0:
 *     1. Compute true reserved = SO contribution + SRE contribution
 *        - SO term: SUM over Sales Order Items at this (item, warehouse)
 *          whose parent SO has docstatus=1 and status NOT IN
 *          ('On Hold','Closed','Cancelled','Completed'), of
 *          (stock_qty - delivered_qty * stock_qty / qty).
 *          This matches erpnext.../get_reserved_qty() server-side SQL.
 *        - SRE term: SUM over active SREs at this (item, warehouse), of
 *          (reserved_qty - delivered_qty).
 *     2. If |stored - true| > 0.01, write:
 *          Bin.reserved_qty   = true
 *          Bin.projected_qty -= (true - stored)   (preserves the formula)
 *
 * Default mode is DRY-RUN. Pass --yes to mutate.
 *
 * Outputs (gitignored via scripts/.out/):
 *   scripts/.out/repair-bin-reserved-<tenant>-<ISODATE>.plan.json
 *   scripts/.out/repair-bin-reserved-<tenant>-<ISODATE>.log.jsonl
 *
 * Usage:
 *   npx tsx scripts/repair-bin-reserved.ts --tenant=anjan
 *   npx tsx scripts/repair-bin-reserved.ts --tenant=anjan --yes
 */

import fs from "fs";
import path from "path";
import { getTenant } from "@/lib/config-store";

const OPEN_SO_STATUSES_EXCLUDED = ["On Hold", "Closed", "Cancelled", "Completed"];
const ACTIVE_SRE_STATUSES = [
  "Reserved",
  "Partially Reserved",
  "Partially Used",
  "Partially Delivered",
];

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
    console.error("Usage: tsx scripts/repair-bin-reserved.ts --tenant=<id> [--yes]");
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

interface BinRow {
  name: string;
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty: number;
  projected_qty: number;
}

interface SoItemRow {
  parent: string;
  item_code: string;
  warehouse: string;
  qty: number;
  stock_qty: number;
  delivered_qty: number;
}

interface SreRow {
  item_code: string;
  warehouse: string;
  reserved_qty: number;
  delivered_qty: number;
}

interface SoDoc {
  name: string;
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
): Promise<T[]> {
  const pageSize = 500;
  let start = 0;
  const out: T[] = [];
  for (;;) {
    const qs = new URLSearchParams({
      filters: JSON.stringify(filters),
      fields: JSON.stringify(fields),
      order_by: "creation asc,name asc",
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

async function fetchDirtyBins(erp: ErpClient): Promise<BinRow[]> {
  return paginate<BinRow>(
    erp,
    "Bin",
    [["reserved_qty", "!=", 0]],
    ["name", "item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"],
  );
}

async function fetchOpenSoNames(erp: ErpClient): Promise<string[]> {
  const rows = await paginate<{ name: string }>(
    erp,
    "Sales Order",
    [
      ["docstatus", "=", 1],
      ["status", "not in", OPEN_SO_STATUSES_EXCLUDED],
    ],
    ["name"],
  );
  return rows.map((r) => r.name);
}

async function fetchSoDoc(erp: ErpClient, name: string): Promise<SoDoc> {
  const resp = await erp.get<{ data: SoDoc }>(
    `/api/resource/Sales%20Order/${encodeURIComponent(name)}`,
  );
  return resp.data;
}

async function fetchAllOpenSoItems(
  erp: ErpClient,
  soNames: string[],
): Promise<Map<string, SoItemRow[]>> {
  const out = new Map<string, SoItemRow[]>();
  const concurrency = 6;
  let idx = 0;
  let done = 0;
  async function worker() {
    while (idx < soNames.length) {
      const my = idx++;
      const name = soNames[my];
      const doc = await fetchSoDoc(erp, name);
      for (const it of doc.items ?? []) {
        if (!it.item_code || !it.warehouse) continue;
        const key = `${it.item_code}|${it.warehouse}`;
        let arr = out.get(key);
        if (!arr) {
          arr = [];
          out.set(key, arr);
        }
        arr.push({
          parent: name,
          item_code: it.item_code,
          warehouse: it.warehouse,
          qty: it.qty,
          stock_qty: it.stock_qty,
          delivered_qty: it.delivered_qty,
        });
      }
      done++;
      if (done % 25 === 0 || done === soNames.length) {
        console.log(`  [SO fetch ${done}/${soNames.length}]`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function fetchAllActiveSres(erp: ErpClient): Promise<Map<string, SreRow[]>> {
  const rows = await paginate<SreRow>(
    erp,
    "Stock Reservation Entry",
    [["status", "in", ACTIVE_SRE_STATUSES]],
    ["item_code", "warehouse", "reserved_qty", "delivered_qty"],
  );
  const out = new Map<string, SreRow[]>();
  for (const r of rows) {
    const key = `${r.item_code}|${r.warehouse}`;
    let arr = out.get(key);
    if (!arr) {
      arr = [];
      out.set(key, arr);
    }
    arr.push(r);
  }
  return out;
}

function computeSoTerm(items: SoItemRow[]): number {
  let sum = 0;
  for (const it of items) {
    if (!it.qty || it.qty <= 0) continue;
    if ((it.delivered_qty ?? 0) >= it.qty) continue;
    const ratio = 1 - (it.delivered_qty ?? 0) / it.qty;
    sum += (it.stock_qty ?? 0) * ratio;
  }
  return sum;
}

function computeSreTerm(sres: SreRow[]): number {
  let sum = 0;
  for (const s of sres) {
    sum += (s.reserved_qty ?? 0) - (s.delivered_qty ?? 0);
  }
  return sum;
}

interface RepairRow {
  bin: string;
  item_code: string;
  warehouse: string;
  actual_qty: number;
  stored: number;
  computed: number;
  delta: number;
  projected_stored: number;
  projected_new: number;
}

interface LogEntry {
  bin: string;
  status: "success" | "failed";
  reason?: string;
  durationMs: number;
  ts: string;
}

async function setBinValue(
  erp: ErpClient,
  binName: string,
  fieldname: string,
  value: number,
): Promise<void> {
  await erp.post(`/api/method/frappe.client.set_value`, {
    doctype: "Bin",
    name: binName,
    fieldname,
    value,
  });
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
  const planPath = path.join(outDir, `repair-bin-reserved-${tenant.id}-${isoDate}.plan.json`);
  const logPath = path.join(outDir, `repair-bin-reserved-${tenant.id}-${isoDate}.log.jsonl`);

  console.log("Fetching bins with reserved_qty != 0 ...");
  const bins = await fetchDirtyBins(erp);
  console.log(`  candidate bins: ${bins.length}`);

  console.log("Fetching open Sales Order names ...");
  const openSoNames = await fetchOpenSoNames(erp);
  console.log(`  open SOs: ${openSoNames.length}`);

  console.log("Fetching open SO items (full docs) ...");
  const soItemMap = await fetchAllOpenSoItems(erp, openSoNames);
  console.log(`  unique (item, warehouse) keys in open SOs: ${soItemMap.size}`);

  console.log("Fetching active SREs ...");
  const sreMap = await fetchAllActiveSres(erp);
  console.log(`  unique (item, warehouse) keys in active SREs: ${sreMap.size}`);

  console.log("Computing per-bin truth ...");
  const repairs: RepairRow[] = [];
  for (let i = 0; i < bins.length; i++) {
    const b = bins[i];
    const key = `${b.item_code}|${b.warehouse}`;
    const items = soItemMap.get(key) ?? [];
    const sres = sreMap.get(key) ?? [];
    const computed = computeSoTerm(items) + computeSreTerm(sres);
    const delta = computed - b.reserved_qty;
    if (Math.abs(delta) > 0.01) {
      repairs.push({
        bin: b.name,
        item_code: b.item_code,
        warehouse: b.warehouse,
        actual_qty: b.actual_qty,
        stored: b.reserved_qty,
        computed,
        delta,
        projected_stored: b.projected_qty,
        projected_new: b.projected_qty - delta,
      });
    }
    if ((i + 1) % 25 === 0 || i === bins.length - 1) {
      console.log(`  [scan ${i + 1}/${bins.length}]  to-repair=${repairs.length}`);
    }
  }

  fs.writeFileSync(
    planPath,
    JSON.stringify(
      {
        tenant: tenant.id,
        generatedAt: new Date().toISOString(),
        mode: args.yes ? "execute" : "dry-run",
        openSoCount: openSoNames.length,
        binCount: bins.length,
        repairCount: repairs.length,
        repairs,
      },
      null,
      2,
    ),
  );
  console.log(`Plan written: ${planPath}`);
  console.log(`\nBins to repair: ${repairs.length}`);
  if (repairs.length > 0) {
    console.log("Sample:");
    for (const r of repairs.slice(0, 5)) {
      console.log(
        `  ${r.item_code} @ ${r.warehouse}: stored=${r.stored} → computed=${r.computed} (delta=${r.delta})`,
      );
    }
  }

  if (!args.yes) {
    console.log("\nDRY-RUN complete. Re-run with --yes to execute.");
    return;
  }

  console.log(`\nApplying ${repairs.length} corrections ...`);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < repairs.length; i++) {
    const r = repairs[i];
    const t0 = Date.now();
    try {
      await setBinValue(erp, r.bin, "reserved_qty", r.computed);
      await setBinValue(erp, r.bin, "projected_qty", r.projected_new);
      ok++;
      const entry: LogEntry = {
        bin: r.bin,
        status: "success",
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      fail++;
      const entry: LogEntry = {
        bin: r.bin,
        status: "failed",
        reason: (err as Error).message,
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    }
    if ((i + 1) % 25 === 0 || i === repairs.length - 1) {
      console.log(`  [repair ${i + 1}/${repairs.length}]  ok=${ok} fail=${fail}`);
    }
  }

  console.log("\nVerifying post-state ...");
  const after = await fetchDirtyBins(erp);
  console.log(`  bins with reserved_qty != 0 (after): ${after.length}`);

  console.log("\n── Done ──");
  console.log(`  Repaired: ${ok} ok, ${fail} failed`);
  console.log(`  Log:      ${logPath}`);
  console.log(`  Plan:     ${planPath}`);

  if (fail > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
