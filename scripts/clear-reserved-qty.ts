/* eslint-disable no-console */
/**
 * Clear all reserved qty on a tenant — non-destructive reset.
 *
 * Two phases:
 *   A. Cancel every submitted Stock Reservation Entry (SRE) whose status is
 *      still holding stock — "Reserved" or "Partially Reserved". This is a
 *      no-op if Stock Settings.enable_stock_reservation is off.
 *   B. Close every open Sales Order (docstatus=1, status NOT IN
 *      Closed/Cancelled/Completed, per_delivered < 100). Calling the
 *      whitelisted erpnext.selling.doctype.sales_order.sales_order.update_status
 *      routes through SO.update_status("Closed") → update_reserved_qty(), which
 *      rewrites tabBin.reserved_qty = SUM(qty − delivered_qty) over open lines.
 *      A Closed SO contributes 0, so the bin lands at 0.
 *
 * Both effects are reversible: SREs can be recreated from the SO; Closed SOs
 * can be Reopened from the list view. Nothing is deleted.
 *
 * Default mode is DRY-RUN — produces a plan JSON listing every SRE/SO it
 * would touch, plus a residual Bin scan. Pass --yes to mutate.
 *
 * Outputs (gitignored via scripts/.out/):
 *   scripts/.out/clear-reserved-qty-<tenant>-<ISODATE>.plan.json
 *   scripts/.out/clear-reserved-qty-<tenant>-<ISODATE>.log.jsonl   (append-only)
 *
 * Usage:
 *   npx tsx scripts/clear-reserved-qty.ts --tenant=anjan
 *   npx tsx scripts/clear-reserved-qty.ts --tenant=anjan --yes
 *   npx tsx scripts/clear-reserved-qty.ts --tenant=anjan --yes --limit=10
 */

import fs from "fs";
import path from "path";
import { getTenant } from "@/lib/config-store";

// ───────────────────────── Args ─────────────────────────

interface Args {
  tenant: string;
  yes: boolean;
  limit?: number;
}

function parseArgs(): Args {
  const arg = (name: string) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const has = (name: string) => process.argv.includes(`--${name}`);

  const tenant = arg("tenant");
  if (!tenant) {
    console.error(
      "Usage: tsx scripts/clear-reserved-qty.ts --tenant=<id> [--yes] [--limit=N]",
    );
    process.exit(1);
  }

  const limitRaw = arg("limit");

  return {
    tenant,
    yes: has("yes"),
    limit: limitRaw ? Number(limitRaw) : undefined,
  };
}

// ───────────────────────── ERPNext client ─────────────────────────

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
  async function call<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const resp = await fetch(`${base}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(30_000),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          const err = new Error(
            `ERPNext ${method} ${endpoint} → HTTP ${resp.status}: ${text.slice(0, 400)}`,
          );
          if (text.includes("QueryDeadlockError") && attempt < 3) {
            lastErr = err;
            const delay = 200 * Math.pow(2, attempt) + Math.random() * 100;
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw err;
        }
        return (await resp.json()) as T;
      } catch (err) {
        if (err instanceof Error && err.message.includes("QueryDeadlockError") && attempt < 3) {
          lastErr = err;
          const delay = 200 * Math.pow(2, attempt) + Math.random() * 100;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastErr ?? new Error(`ERPNext ${method} ${endpoint}: retries exhausted`);
  }
  return {
    get: <T>(endpoint: string) => call<T>("GET", endpoint),
    post: <T>(endpoint: string, body: unknown) => call<T>("POST", endpoint, body),
  };
}

// ───────────────────────── ERPNext shapes ─────────────────────────

interface SreRow {
  name: string;
  item_code: string;
  warehouse: string;
  reserved_qty: number;
  delivered_qty: number;
  status: string;
  voucher_type: string;
  voucher_no: string;
}

interface SoRow {
  name: string;
  status: string;
  per_delivered: number;
  customer: string;
  transaction_date: string;
}

interface BinResidualRow {
  item_code: string;
  warehouse: string;
  reserved_qty: number;
}

// ───────────────────────── Plan / log shapes ─────────────────────────

interface PlanFile {
  tenant: string;
  generatedAt: string;
  mode: "dry-run" | "execute";
  sreEnabled: boolean;
  sresToCancel: SreRow[];
  sosToClose: SoRow[];
  residualBinBefore: BinResidualRow[];
}

type ActionKind = "cancel_sre" | "close_so";

interface LogEntry {
  action: ActionKind;
  name: string;
  status: "success" | "failed";
  reason?: string;
  durationMs: number;
  ts: string;
}

// ───────────────────────── Fetch helpers ─────────────────────────

async function fetchSreEnabled(erp: ErpClient): Promise<boolean> {
  const qs = new URLSearchParams({
    doctype: "Stock Settings",
    fieldname: "enable_stock_reservation",
  });
  const resp = await erp.get<{ message: { enable_stock_reservation?: number | string } }>(
    `/api/method/frappe.client.get_value?${qs}`,
  );
  const v = resp.message?.enable_stock_reservation;
  return Number(v) === 1;
}

async function fetchOpenSres(erp: ErpClient): Promise<SreRow[]> {
  const filters = [
    ["docstatus", "=", 1],
    ["status", "in", ["Reserved", "Partially Reserved"]],
  ];
  const fields = [
    "name",
    "item_code",
    "warehouse",
    "reserved_qty",
    "delivered_qty",
    "status",
    "voucher_type",
    "voucher_no",
  ];
  return paginate<SreRow>(erp, "Stock Reservation Entry", filters, fields);
}

async function fetchOpenSos(erp: ErpClient): Promise<SoRow[]> {
  // status NOT IN ('Closed','Cancelled','Completed') AND per_delivered < 100
  // captures every SO whose remaining (qty − delivered_qty) contributes to
  // Bin.reserved_qty via get_reserved_qty(). 'On Hold' is intentionally
  // included — it still reserves.
  const filters = [
    ["docstatus", "=", 1],
    ["status", "not in", ["Closed", "Cancelled", "Completed"]],
    ["per_delivered", "<", 100],
  ];
  const fields = ["name", "status", "per_delivered", "customer", "transaction_date"];
  return paginate<SoRow>(erp, "Sales Order", filters, fields);
}

async function fetchResidualBin(erp: ErpClient): Promise<BinResidualRow[]> {
  const filters = [["reserved_qty", "!=", 0]];
  const fields = ["item_code", "warehouse", "reserved_qty"];
  return paginate<BinResidualRow>(erp, "Bin", filters, fields);
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

// ───────────────────────── Mutators ─────────────────────────

async function cancelSre(erp: ErpClient, name: string): Promise<void> {
  // Primary: frappe.client.cancel
  try {
    await erp.post(`/api/method/frappe.client.cancel`, {
      doctype: "Stock Reservation Entry",
      name,
    });
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fallback to run_doc_method (matches CLAUDE.md guidance)
    if (!/cancel/i.test(msg)) throw err;
    await erp.post(`/api/method/run_doc_method`, {
      method: "cancel",
      docs: JSON.stringify({ doctype: "Stock Reservation Entry", name }),
    });
  }
}

async function closeSo(erp: ErpClient, name: string): Promise<void> {
  await erp.post(`/api/method/erpnext.selling.doctype.sales_order.sales_order.update_status`, {
    status: "Closed",
    name,
  });
}

// ───────────────────────── Main ─────────────────────────

async function main() {
  const args = parseArgs();
  const tenant = getTenant(args.tenant);
  if (!tenant) {
    console.error(`Tenant not found: ${args.tenant}`);
    process.exit(1);
  }
  console.log(
    `Tenant: ${tenant.id} (${tenant.url})  mode: ${args.yes ? "EXECUTE" : "DRY-RUN"}`,
  );

  const erp = makeErp(tenant.url, tenant.apiKey);

  const outDir = path.join(process.cwd(), "scripts", ".out");
  fs.mkdirSync(outDir, { recursive: true });
  const isoDate = new Date().toISOString().slice(0, 10);
  const planPath = path.join(outDir, `clear-reserved-qty-${tenant.id}-${isoDate}.plan.json`);
  const logPath = path.join(outDir, `clear-reserved-qty-${tenant.id}-${isoDate}.log.jsonl`);

  // ── Discovery ──
  console.log("Checking Stock Reservation feature flag ...");
  const sreEnabled = await fetchSreEnabled(erp);
  console.log(`  enable_stock_reservation = ${sreEnabled}`);

  console.log("Fetching open Stock Reservation Entries ...");
  const sres = sreEnabled ? await fetchOpenSres(erp) : [];
  console.log(`  open SREs (Reserved / Partially Reserved): ${sres.length}`);

  console.log("Fetching open Sales Orders ...");
  let sos = await fetchOpenSos(erp);
  console.log(`  open SOs (per_delivered < 100, not Closed/Cancelled/Completed): ${sos.length}`);

  console.log("Scanning residual Bin rows (reserved_qty != 0) ...");
  const residualBefore = await fetchResidualBin(erp);
  console.log(`  Bin rows with reserved_qty != 0: ${residualBefore.length}`);

  // Apply --limit AFTER discovery so the plan shows the full set.
  let queuedSres = sres;
  let queuedSos = sos;
  if (args.limit != null) {
    queuedSres = sres.slice(0, args.limit);
    queuedSos = sos.slice(0, args.limit);
    console.log(`Limit applied: will touch ${queuedSres.length} SREs and ${queuedSos.length} SOs.`);
  }

  // ── Plan ──
  const plan: PlanFile = {
    tenant: tenant.id,
    generatedAt: new Date().toISOString(),
    mode: args.yes ? "execute" : "dry-run",
    sreEnabled,
    sresToCancel: queuedSres,
    sosToClose: queuedSos,
    residualBinBefore: residualBefore,
  };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(`\nPlan written: ${planPath}`);

  if (!args.yes) {
    console.log("\nDRY-RUN complete. Re-run with --yes to execute.");
    return;
  }

  // ── Execute Phase A: cancel SREs ──
  console.log(`\nExecuting Phase A: cancelling ${queuedSres.length} SREs ...`);
  let sreOk = 0;
  let sreFail = 0;
  for (let i = 0; i < queuedSres.length; i++) {
    const sre = queuedSres[i];
    const t0 = Date.now();
    try {
      await cancelSre(erp, sre.name);
      sreOk++;
      const entry: LogEntry = {
        action: "cancel_sre",
        name: sre.name,
        status: "success",
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      sreFail++;
      const entry: LogEntry = {
        action: "cancel_sre",
        name: sre.name,
        status: "failed",
        reason: (err as Error).message,
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    }
    if ((i + 1) % 25 === 0 || i === queuedSres.length - 1) {
      console.log(`  [SRE ${i + 1}/${queuedSres.length}]  ok=${sreOk} fail=${sreFail}`);
    }
  }

  // ── Execute Phase B: close SOs ──
  console.log(`\nExecuting Phase B: closing ${queuedSos.length} Sales Orders ...`);
  let soOk = 0;
  let soFail = 0;
  for (let i = 0; i < queuedSos.length; i++) {
    const so = queuedSos[i];
    const t0 = Date.now();
    try {
      await closeSo(erp, so.name);
      soOk++;
      const entry: LogEntry = {
        action: "close_so",
        name: so.name,
        status: "success",
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      soFail++;
      const entry: LogEntry = {
        action: "close_so",
        name: so.name,
        status: "failed",
        reason: (err as Error).message,
        durationMs: Date.now() - t0,
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    }
    if ((i + 1) % 25 === 0 || i === queuedSos.length - 1) {
      console.log(`  [SO ${i + 1}/${queuedSos.length}]  ok=${soOk} fail=${soFail}`);
    }
  }

  // ── Verify Phase C ──
  console.log("\nVerifying residual Bin rows ...");
  const residualAfter = await fetchResidualBin(erp);
  console.log(`  Bin rows with reserved_qty != 0 (after): ${residualAfter.length}`);
  if (residualAfter.length > 0) {
    console.log("  Residual sample (up to 10):");
    for (const r of residualAfter.slice(0, 10)) {
      console.log(`    ${r.item_code} @ ${r.warehouse}: ${r.reserved_qty}`);
    }
  }

  // ── Summary ──
  console.log("\n── Done ──");
  console.log(`  SREs cancelled:  ${sreOk} ok, ${sreFail} failed`);
  console.log(`  SOs closed:      ${soOk} ok, ${soFail} failed`);
  console.log(`  Bin residual:    ${residualBefore.length} → ${residualAfter.length}`);
  console.log(`  Log:             ${logPath}`);
  console.log(`  Plan:            ${planPath}`);

  if (sreFail > 0 || soFail > 0 || residualAfter.length > 0) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
