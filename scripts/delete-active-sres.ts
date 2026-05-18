/* eslint-disable no-console */
/**
 * Delete every Stock Reservation Entry whose status is currently "active",
 * i.e. it is still contributing to Bin.reserved_qty:
 *
 *   - Reserved
 *   - Partially Reserved
 *   - Partially Used
 *   - Partially Delivered
 *
 * Submitted SREs (docstatus=1) must first be cancelled (docstatus=2) before
 * they can be deleted. The script does both passes in one run.
 *
 * Historical SREs (status = Delivered / Closed) and already-cancelled SREs
 * are intentionally left untouched — they preserve the audit trail.
 *
 * Default mode is DRY-RUN. Pass --yes to mutate. Outputs:
 *   scripts/.out/delete-active-sres-<tenant>-<ISODATE>.plan.json
 *   scripts/.out/delete-active-sres-<tenant>-<ISODATE>.log.jsonl
 *
 * Usage:
 *   npx tsx scripts/delete-active-sres.ts --tenant=anjan
 *   npx tsx scripts/delete-active-sres.ts --tenant=anjan --yes
 */

import fs from "fs";
import path from "path";
import { getTenant } from "@/lib/config-store";

const ACTIVE_STATUSES = [
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
    console.error("Usage: tsx scripts/delete-active-sres.ts --tenant=<id> [--yes]");
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

interface SreRow {
  name: string;
  docstatus: number;
  status: string;
  item_code: string;
  warehouse: string;
  reserved_qty: number;
  delivered_qty: number;
  voucher_no: string;
}

async function fetchActiveSres(erp: ErpClient): Promise<SreRow[]> {
  const filters = [["status", "in", ACTIVE_STATUSES]];
  const fields = [
    "name",
    "docstatus",
    "status",
    "item_code",
    "warehouse",
    "reserved_qty",
    "delivered_qty",
    "voucher_no",
  ];
  const qs = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    order_by: "creation asc,name asc",
    limit_page_length: "2000",
  });
  const resp = await erp.get<{ data: SreRow[] }>(
    `/api/resource/Stock%20Reservation%20Entry?${qs}`,
  );
  return resp.data;
}

async function cancelSre(erp: ErpClient, name: string): Promise<void> {
  try {
    await erp.post(`/api/method/frappe.client.cancel`, {
      doctype: "Stock Reservation Entry",
      name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/cancel/i.test(msg)) throw err;
    await erp.post(`/api/method/run_doc_method`, {
      method: "cancel",
      docs: JSON.stringify({ doctype: "Stock Reservation Entry", name }),
    });
  }
}

async function deleteSre(erp: ErpClient, name: string): Promise<void> {
  await erp.post(`/api/method/frappe.client.delete`, {
    doctype: "Stock Reservation Entry",
    name,
  });
}

interface LogEntry {
  action: "cancel" | "delete";
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
  const planPath = path.join(outDir, `delete-active-sres-${tenant.id}-${isoDate}.plan.json`);
  const logPath = path.join(outDir, `delete-active-sres-${tenant.id}-${isoDate}.log.jsonl`);

  console.log("Fetching active Stock Reservation Entries ...");
  const rows = await fetchActiveSres(erp);
  console.log(`  active SREs found: ${rows.length}`);

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  for (const [s, n] of Object.entries(byStatus)) console.log(`    ${s}: ${n}`);

  fs.writeFileSync(
    planPath,
    JSON.stringify(
      { tenant: tenant.id, generatedAt: new Date().toISOString(), mode: args.yes ? "execute" : "dry-run", rows },
      null,
      2,
    ),
  );
  console.log(`Plan written: ${planPath}`);

  if (!args.yes) {
    console.log("\nDRY-RUN complete. Re-run with --yes to execute.");
    return;
  }

  const toCancel = rows.filter((r) => r.docstatus === 1);
  console.log(`\nPhase 1: cancelling ${toCancel.length} submitted SREs ...`);
  let cOk = 0;
  let cFail = 0;
  for (let i = 0; i < toCancel.length; i++) {
    const r = toCancel[i];
    const t0 = Date.now();
    try {
      await cancelSre(erp, r.name);
      cOk++;
      const entry: LogEntry = {
        action: "cancel",
        name: r.name,
        status: "success",
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      cFail++;
      const entry: LogEntry = {
        action: "cancel",
        name: r.name,
        status: "failed",
        reason: (err as Error).message,
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    }
    if ((i + 1) % 25 === 0 || i === toCancel.length - 1) {
      console.log(`  [cancel ${i + 1}/${toCancel.length}]  ok=${cOk} fail=${cFail}`);
    }
  }

  console.log(`\nPhase 2: deleting ${rows.length} SREs ...`);
  let dOk = 0;
  let dFail = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const t0 = Date.now();
    try {
      await deleteSre(erp, r.name);
      dOk++;
      const entry: LogEntry = {
        action: "delete",
        name: r.name,
        status: "success",
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      dFail++;
      const entry: LogEntry = {
        action: "delete",
        name: r.name,
        status: "failed",
        reason: (err as Error).message,
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    }
    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      console.log(`  [delete ${i + 1}/${rows.length}]  ok=${dOk} fail=${dFail}`);
    }
  }

  console.log("\n── Done ──");
  console.log(`  Cancelled: ${cOk} ok, ${cFail} failed`);
  console.log(`  Deleted:   ${dOk} ok, ${dFail} failed`);
  console.log(`  Log:       ${logPath}`);

  if (cFail > 0 || dFail > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
