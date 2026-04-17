/* eslint-disable no-console */
/**
 * Bulk auto-allocate submitted Payment Entries that were submitted without
 * references (empty refs -> "unallocated_amount > 0"). Mirrors the
 * cancel → amend-with-FIFO-refs flow in src/hooks/use-payment-entries.ts
 * (useAutoAllocatePaymentEntry + useCreatePaymentEntry), which is already
 * shipped for the per-PE case.
 *
 * Safety filters (baked in, not flags):
 *   - docstatus == 1
 *   - unallocated_amount > 0.01
 *   - total_allocated_amount < 0.01   (skip partials — may be intentional splits)
 *   - payment_type in ("Receive", "Pay") (skip "Internal Transfer")
 *
 * Cross-currency PEs (paid_from_account_currency !== paid_to_account_currency)
 * are skipped with reason "cross_currency" and must be reviewed manually — we
 * copy rates from the original doc which is only safe when rates are trivially
 * consistent with the amounts (true by definition for same-currency PEs).
 *
 * Default mode is DRY-RUN. Pass --yes to mutate ERPNext.
 *
 * Outputs (gitignored via scripts/.out/):
 *   scripts/.out/auto-allocate-<tenant>-<ISODATE>.plan.json
 *   scripts/.out/auto-allocate-<tenant>-<ISODATE>.log.jsonl  (append-only, resumable)
 *
 * Usage:
 *   npx tsx scripts/auto-allocate-payments.ts --tenant=anjan
 *   npx tsx scripts/auto-allocate-payments.ts --tenant=anjan --yes --limit=10
 *   npx tsx scripts/auto-allocate-payments.ts --tenant=anjan --yes --log=scripts/.out/auto-allocate-anjan-2026-04-17.log.jsonl
 */

import fs from "fs";
import path from "path";
import { getTenant } from "@/lib/config-store";

// ───────────────────────── Args ─────────────────────────

interface Args {
  tenant: string;
  yes: boolean;
  limit?: number;
  concurrency: number;
  log?: string;
  recover?: string[];
}

function parseArgs(): Args {
  const arg = (name: string) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const has = (name: string) => process.argv.includes(`--${name}`);

  const tenant = arg("tenant");
  if (!tenant) {
    console.error(
      "Usage: tsx scripts/auto-allocate-payments.ts --tenant=<id> [--yes] [--limit=N] [--concurrency=3] [--log=<path>]",
    );
    process.exit(1);
  }

  const limitRaw = arg("limit");
  const concurrencyRaw = arg("concurrency");

  const recoverRaw = arg("recover");
  const recover = recoverRaw
    ? recoverRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  return {
    tenant,
    yes: has("yes"),
    limit: limitRaw ? Number(limitRaw) : undefined,
    concurrency: concurrencyRaw ? Number(concurrencyRaw) : 1,
    log: arg("log"),
    recover,
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
    // Retry transient deadlocks up to 4 times with exponential backoff.
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
          // Only retry on deadlock — everything else is a real error
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
        // Network-level errors (AbortError, fetch failures) don't deadlock; don't retry.
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

// ───────────────────────── ERPNext types ─────────────────────────

interface PaymentEntryRow {
  name: string;
  payment_type: "Receive" | "Pay" | "Internal Transfer";
  party_type: "Customer" | "Supplier";
  party: string;
  company: string;
  paid_amount: number;
  received_amount: number;
  unallocated_amount: number;
  total_allocated_amount: number;
  posting_date: string;
  paid_from: string;
  paid_to: string;
  paid_from_account_currency: string;
  paid_to_account_currency: string;
  source_exchange_rate: number;
  target_exchange_rate: number;
  reference_no?: string;
  reference_date?: string;
  remarks?: string;
  naming_series?: string;
  docstatus: number;
}

interface OutstandingInvoiceRow {
  name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  currency: string;
}

interface PaymentRef {
  reference_doctype: "Sales Invoice" | "Purchase Invoice";
  reference_name: string;
  total_amount: number;
  outstanding_amount: number;
  allocated_amount: number;
}

// ───────────────────────── Plan / Log types ─────────────────────────

type SkipReason =
  | "cross_currency"
  | "no_outstanding"
  | "party_account_lookup_failed"
  | "already_allocated_post_recheck";

interface PlanItem {
  action: "allocate" | "skip";
  skipReason?: SkipReason;
  original: string;
  payment_type: "Receive" | "Pay";
  party: string;
  paid_amount: number;
  received_amount: number;
  pool: number;
  partyAccount?: string;
  refs?: PaymentRef[];
  totalAllocated?: number;
  remaining?: number;
}

interface LogEntry {
  original: string;
  amended?: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
  refs?: number;
  durationMs?: number;
  ts: string;
}

// ───────────────────────── Helpers ─────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

async function fetchCompanyCurrency(erp: ErpClient, company: string): Promise<string> {
  const resp = await erp.get<{ data: { default_currency?: string } }>(
    `/api/resource/Company/${encodeURIComponent(company)}`,
  );
  const cur = resp.data.default_currency;
  if (!cur) throw new Error(`Company ${company} has no default_currency`);
  return cur;
}

async function fetchCandidates(erp: ErpClient, company?: string): Promise<PaymentEntryRow[]> {
  // Only submitted empty-refs PEs (docstatus=1). We deliberately do NOT include
  // docstatus=2 "orphan" candidates: 715+ PEs on ANJAN were intentionally cancelled
  // by real users and must stay cancelled. Crash-recovery for this script's own
  // orphans is handled by executeAllocation's idempotent docstatus=2 path — but
  // only for PEs already in the queue, not via broad discovery.
  const filters = [
    ["docstatus", "=", 1],
    ["unallocated_amount", ">", 0.01],
    ["total_allocated_amount", "<", 0.01],
    ["payment_type", "in", ["Receive", "Pay"]],
    ...(company ? [["company", "=", company]] : []),
  ];

  const fields = [
    "name",
    "payment_type",
    "party_type",
    "party",
    "company",
    "paid_amount",
    "received_amount",
    "unallocated_amount",
    "total_allocated_amount",
    "posting_date",
    "paid_from",
    "paid_to",
    "paid_from_account_currency",
    "paid_to_account_currency",
    "source_exchange_rate",
    "target_exchange_rate",
    "reference_no",
    "reference_date",
    "remarks",
    "naming_series",
    "docstatus",
  ];

  const pageSize = 500;
  let start = 0;
  const out: PaymentEntryRow[] = [];
  for (;;) {
    const qs = new URLSearchParams({
      filters: JSON.stringify(filters),
      fields: JSON.stringify(fields),
      order_by: "posting_date asc,name asc",
      limit_page_length: String(pageSize),
      limit_start: String(start),
    });
    const resp = await erp.get<{ data: PaymentEntryRow[] }>(
      `/api/resource/Payment%20Entry?${qs}`,
    );
    if (!resp.data.length) break;
    out.push(...resp.data);
    if (resp.data.length < pageSize) break;
    start += pageSize;
  }
  return out;
}

async function fetchOutstanding(
  erp: ErpClient,
  doctype: "Sales Invoice" | "Purchase Invoice",
  partyField: "customer" | "supplier",
  party: string,
  company: string,
): Promise<OutstandingInvoiceRow[]> {
  const qs = new URLSearchParams({
    filters: JSON.stringify([
      [partyField, "=", party],
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0],
      ["company", "=", company],
    ]),
    fields: JSON.stringify([
      "name",
      "posting_date",
      "due_date",
      "grand_total",
      "outstanding_amount",
      "currency",
    ]),
    order_by: "due_date asc",
    limit_page_length: "500",
  });
  const resp = await erp.get<{ data: OutstandingInvoiceRow[] }>(
    `/api/resource/${encodeURIComponent(doctype)}?${qs}`,
  );
  return resp.data ?? [];
}

interface PartyFlags {
  disabled: boolean;
  is_frozen: boolean;
}

async function fetchPartyFlags(
  erp: ErpClient,
  doctype: "Customer" | "Supplier",
  name: string,
): Promise<PartyFlags> {
  const resp = await erp.get<{
    data: { disabled?: number | boolean; is_frozen?: number | boolean };
  }>(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  return {
    disabled: Boolean(resp.data.disabled),
    is_frozen: Boolean(resp.data.is_frozen),
  };
}

async function setPartyFlag(
  erp: ErpClient,
  doctype: "Customer" | "Supplier",
  name: string,
  fieldname: "disabled" | "is_frozen",
  value: boolean,
): Promise<void> {
  await erp.post("/api/method/frappe.client.set_value", {
    doctype,
    name,
    fieldname,
    value: value ? 1 : 0,
  });
}

async function fetchInvoicePartyAccount(
  erp: ErpClient,
  doctype: "Sales Invoice" | "Purchase Invoice",
  name: string,
): Promise<{ account: string; currency: string } | null> {
  const field = doctype === "Sales Invoice" ? "debit_to" : "credit_to";
  const qs = new URLSearchParams({
    filters: JSON.stringify([["name", "=", name]]),
    fields: JSON.stringify([field]),
    limit_page_length: "1",
  });
  const resp = await erp.get<{ data: Array<Record<string, string>> }>(
    `/api/resource/${encodeURIComponent(doctype)}?${qs}`,
  );
  const accountName = resp.data?.[0]?.[field];
  if (!accountName) return null;

  const qs2 = new URLSearchParams({
    filters: JSON.stringify([["name", "=", accountName]]),
    fields: JSON.stringify(["name", "account_currency"]),
    limit_page_length: "1",
  });
  const accResp = await erp.get<{ data: Array<{ name: string; account_currency: string }> }>(
    `/api/resource/Account?${qs2}`,
  );
  const acc = accResp.data?.[0];
  if (!acc) return null;
  return { account: acc.name, currency: acc.account_currency };
}

function buildFifoRefs(
  doctype: "Sales Invoice" | "Purchase Invoice",
  pool: number,
  outstanding: OutstandingInvoiceRow[],
): PaymentRef[] {
  let remaining = pool;
  const refs: PaymentRef[] = [];
  for (const inv of outstanding) {
    if (remaining <= 0.001) break;
    const allocated = Math.min(inv.outstanding_amount, remaining);
    if (allocated <= 0) continue;
    refs.push({
      reference_doctype: doctype,
      reference_name: inv.name,
      total_amount: inv.grand_total,
      outstanding_amount: inv.outstanding_amount,
      allocated_amount: allocated,
    });
    remaining = Math.max(0, remaining - allocated);
  }
  return refs;
}

// ───────────────────────── Discovery + planning ─────────────────────────

async function planForPe(
  erp: ErpClient,
  pe: PaymentEntryRow,
): Promise<PlanItem> {
  const isReceive = pe.payment_type === "Receive";
  const invoiceDoctype: "Sales Invoice" | "Purchase Invoice" = isReceive
    ? "Sales Invoice"
    : "Purchase Invoice";
  const partyField: "customer" | "supplier" = isReceive ? "customer" : "supplier";
  const pool = isReceive ? pe.paid_amount : pe.received_amount;

  const base: PlanItem = {
    action: "skip",
    original: pe.name,
    payment_type: pe.payment_type as "Receive" | "Pay",
    party: pe.party,
    paid_amount: pe.paid_amount,
    received_amount: pe.received_amount,
    pool,
  };

  if (pe.paid_from_account_currency !== pe.paid_to_account_currency) {
    return { ...base, skipReason: "cross_currency" };
  }

  const outstanding = await fetchOutstanding(
    erp,
    invoiceDoctype,
    partyField,
    pe.party,
    pe.company,
  );
  if (outstanding.length === 0) {
    return { ...base, skipReason: "no_outstanding" };
  }

  const refs = buildFifoRefs(invoiceDoctype, pool, outstanding);
  if (refs.length === 0) {
    return { ...base, skipReason: "no_outstanding" };
  }

  // Resolve the party account from the first referenced invoice (hook parity)
  const partyAcc = await fetchInvoicePartyAccount(erp, invoiceDoctype, refs[0].reference_name);
  if (!partyAcc) {
    return { ...base, skipReason: "party_account_lookup_failed" };
  }

  const totalAllocated = refs.reduce((s, r) => s + r.allocated_amount, 0);
  const remaining = Math.max(0, pool - totalAllocated);

  return {
    ...base,
    action: "allocate",
    partyAccount: partyAcc.account,
    refs,
    totalAllocated,
    remaining,
  };
}

// ───────────────────────── Execution ─────────────────────────

async function executeAllocation(
  erp: ErpClient,
  original: PaymentEntryRow,
): Promise<{ amended: string; refCount: number }> {
  // Per-PE verify: refetch to catch anything that changed since discovery.
  // Accept two starting states:
  //   docstatus=1 → normal path: cancel + amend
  //   docstatus=2 AND no existing amendment → orphan path (prior run crashed
  //     between cancel and insert): skip cancel, insert+submit directly
  const live = await erp.get<{ data: PaymentEntryRow }>(
    `/api/resource/Payment%20Entry/${encodeURIComponent(original.name)}`,
  );

  let needsCancel: boolean;
  if (live.data.docstatus === 1) {
    if (live.data.total_allocated_amount >= 0.01) {
      throw new Error(`precondition_failed: already allocated`);
    }
    needsCancel = true;
  } else if (live.data.docstatus === 2) {
    // Check for existing amendment — if one exists, this was already completed
    const qs = new URLSearchParams({
      filters: JSON.stringify([
        ["amended_from", "=", original.name],
        ["docstatus", "=", 1],
      ]),
      fields: JSON.stringify(["name"]),
      limit_page_length: "1",
    });
    const amends = await erp.get<{ data: Array<{ name: string }> }>(
      `/api/resource/Payment%20Entry?${qs}`,
    );
    if (amends.data && amends.data.length > 0) {
      throw new Error(`precondition_failed: already amended to ${amends.data[0].name}`);
    }
    needsCancel = false;
  } else {
    throw new Error(`precondition_failed: docstatus=${live.data.docstatus}`);
  }

  const isReceive = original.payment_type === "Receive";
  const invoiceDoctype: "Sales Invoice" | "Purchase Invoice" = isReceive
    ? "Sales Invoice"
    : "Purchase Invoice";
  const partyField: "customer" | "supplier" = isReceive ? "customer" : "supplier";
  const pool = isReceive ? original.paid_amount : original.received_amount;

  // Re-plan with FRESH outstanding data — guards against another run (or manual
  // entry) consuming invoice capacity between discover and execute.
  const outstanding = await fetchOutstanding(
    erp,
    invoiceDoctype,
    partyField,
    original.party,
    original.company,
  );
  const refs = buildFifoRefs(invoiceDoctype, pool, outstanding);
  if (refs.length === 0) {
    throw new Error("no_outstanding_at_execute_time");
  }

  const partyAcc = await fetchInvoicePartyAccount(erp, invoiceDoctype, refs[0].reference_name);
  if (!partyAcc) {
    throw new Error("party_account_lookup_failed_at_execute_time");
  }

  if (needsCancel) {
    await erp.post("/api/method/frappe.client.cancel", {
      doctype: "Payment Entry",
      name: original.name,
    });
  }

  const paymentAccount = isReceive ? original.paid_to : original.paid_from;

  // Build amended doc (byte-parity with useCreatePaymentEntry's same-currency path)
  const doc: Record<string, unknown> = {
    doctype: "Payment Entry",
    payment_type: original.payment_type,
    posting_date: original.posting_date,
    party_type: original.party_type,
    party: original.party,
    company: original.company,
    paid_from: isReceive ? partyAcc.account : paymentAccount,
    paid_to: isReceive ? paymentAccount : partyAcc.account,
    paid_from_account_currency: original.paid_from_account_currency,
    paid_to_account_currency: original.paid_to_account_currency,
    // Hook parity: for same-currency PEs force rate=1. We already filter cross-currency
    // out in planForPe, so reaching here means currencies match → rate MUST be 1.
    // This also scrubs corrupt rates (e.g. 8.23e-05) from legacy docs that would
    // otherwise cascade into "Difference Amount must be zero" at submit time.
    source_exchange_rate: 1,
    target_exchange_rate: 1,
    paid_amount: original.paid_amount,
    received_amount: original.received_amount,
    reference_no: original.reference_no || original.posting_date,
    reference_date: original.reference_date || original.posting_date,
    remarks: original.remarks || undefined,
    amended_from: original.name,
    naming_series: original.naming_series,
    references: refs.map((a) => ({
      doctype: "Payment Entry Reference",
      reference_doctype: a.reference_doctype,
      reference_name: a.reference_name,
      total_amount: a.total_amount,
      outstanding_amount: a.outstanding_amount,
      allocated_amount: a.allocated_amount,
    })),
  };

  const inserted = await erp.post<{ message: Record<string, unknown> }>(
    "/api/method/frappe.client.insert",
    { doc },
  );
  const draftName = inserted.message.name as string;

  await erp.post("/api/method/frappe.client.submit", {
    doc: inserted.message,
  });

  return { amended: draftName, refCount: refs.length };
}

// ───────────────────────── Concurrency helper ─────────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;
  async function pull() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () => pull());
  await Promise.all(pool);
  return results;
}

// ───────────────────────── Main ─────────────────────────

async function main() {
  const args = parseArgs();
  const tenant = getTenant(args.tenant);
  if (!tenant) {
    console.error(`Tenant not found: ${args.tenant}`);
    process.exit(1);
  }
  console.log(`Tenant: ${tenant.id} (${tenant.url})  mode: ${args.yes ? "EXECUTE" : "DRY-RUN"}`);

  const erp = makeErp(tenant.url, tenant.apiKey);

  // Company currency (logged for operator)
  // (we filter cross-currency PEs out of the allocate path)
  const outDir = path.join(process.cwd(), "scripts", ".out");
  fs.mkdirSync(outDir, { recursive: true });
  const isoDate = new Date().toISOString().slice(0, 10);
  const planPath = path.join(outDir, `auto-allocate-${tenant.id}-${isoDate}.plan.json`);
  const logPath =
    args.log ?? path.join(outDir, `auto-allocate-${tenant.id}-${isoDate}.log.jsonl`);

  // Resumability: read any existing log to find already-processed PEs
  const alreadyDone = new Set<string>();
  if (fs.existsSync(logPath)) {
    const prior = fs.readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
    for (const line of prior) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        if (entry.status === "success") alreadyDone.add(entry.original);
      } catch {
        /* skip malformed lines */
      }
    }
    if (alreadyDone.size > 0) {
      console.log(`Found existing log with ${alreadyDone.size} successful runs — will skip those.`);
    }
  }

  let candidates: PaymentEntryRow[];
  if (args.recover && args.recover.length > 0) {
    console.log(`Recovery mode: fetching ${args.recover.length} named PE(s) directly ...`);
    candidates = [];
    for (const name of args.recover) {
      const resp = await erp.get<{ data: PaymentEntryRow }>(
        `/api/resource/Payment%20Entry/${encodeURIComponent(name)}`,
      );
      candidates.push(resp.data);
    }
    // Guardrail: recovery must only touch docstatus=2 with no amendment.
    // executeAllocation will re-verify, but fail loudly here too.
    for (const pe of candidates) {
      if (pe.docstatus !== 2) {
        console.error(
          `REFUSING: --recover requires docstatus=2, but ${pe.name} has docstatus=${pe.docstatus}. Aborting.`,
        );
        process.exit(2);
      }
    }
  } else {
    console.log("Fetching candidate Payment Entries ...");
    candidates = await fetchCandidates(erp);
    console.log(`Candidates (docstatus=1, unalloc>0.01, total_alloc<0.01): ${candidates.length}`);
  }

  // Skip already-processed; apply --limit
  let queue = candidates.filter((pe) => !alreadyDone.has(pe.name));
  if (args.limit != null) queue = queue.slice(0, args.limit);
  console.log(`Queue (after resume/limit): ${queue.length}`);

  // ── Plan phase ──
  console.log("Planning (parallel fetch of outstanding invoices + party accounts) ...");
  const planStart = Date.now();
  const plan = await runWithConcurrency(queue, args.concurrency, async (pe, i) => {
    try {
      const p = await planForPe(erp, pe);
      if ((i + 1) % 50 === 0 || i === queue.length - 1) {
        console.log(`  [plan ${i + 1}/${queue.length}]`);
      }
      return p;
    } catch (err) {
      return {
        action: "skip" as const,
        original: pe.name,
        payment_type: pe.payment_type as "Receive" | "Pay",
        party: pe.party,
        paid_amount: pe.paid_amount,
        received_amount: pe.received_amount,
        pool: pe.payment_type === "Receive" ? pe.paid_amount : pe.received_amount,
        skipReason: "party_account_lookup_failed" as SkipReason,
        __error: (err as Error).message,
      } satisfies PlanItem & { __error?: string };
    }
  });
  console.log(`Planning done in ${((Date.now() - planStart) / 1000).toFixed(1)}s`);

  const allocateItems = plan.filter((p) => p.action === "allocate");
  const skipItems = plan.filter((p) => p.action === "skip");
  const skipReasons = skipItems.reduce<Record<string, number>>((acc, p) => {
    const k = p.skipReason ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n── Plan summary ──");
  console.log(`  allocate: ${allocateItems.length}`);
  console.log(`  skip:     ${skipItems.length}`);
  for (const [k, v] of Object.entries(skipReasons)) {
    console.log(`    ${k}: ${v}`);
  }

  fs.writeFileSync(
    planPath,
    JSON.stringify(
      { tenant: tenant.id, generatedAt: new Date().toISOString(), mode: args.yes ? "execute" : "dry-run", plan },
      null,
      2,
    ),
  );
  console.log(`\nPlan written: ${planPath}`);

  if (!args.yes) {
    console.log("\nDRY-RUN: no mutations. Re-run with --yes to execute.");
    return;
  }

  // ── Party flag pre-pass (disabled + is_frozen) ──
  // ERPNext blocks cancel when the party is disabled OR frozen, even for historical
  // docs. Snapshot both flags for each party in the allocate set, temporarily clear
  // them, then restore in a finally block after the run.
  type PartyRef = { doctype: "Customer" | "Supplier"; name: string };
  const partyKey = (doctype: "Customer" | "Supplier", name: string) =>
    `${doctype}::${name}`;
  const flagsToRestore = new Map<string, PartyRef & PartyFlags>();
  const uniqueParties = new Map<string, PartyRef>();
  for (const it of allocateItems) {
    const d: "Customer" | "Supplier" = it.payment_type === "Receive" ? "Customer" : "Supplier";
    uniqueParties.set(partyKey(d, it.party), { doctype: d, name: it.party });
  }
  console.log(`\nChecking ${uniqueParties.size} unique parties for disabled/frozen flags ...`);
  const partyList = Array.from(uniqueParties.values());
  await runWithConcurrency(partyList, args.concurrency, async (p) => {
    try {
      const flags = await fetchPartyFlags(erp, p.doctype, p.name);
      if (flags.disabled || flags.is_frozen) {
        // Clear the flags that are set
        if (flags.disabled) await setPartyFlag(erp, p.doctype, p.name, "disabled", false);
        if (flags.is_frozen) await setPartyFlag(erp, p.doctype, p.name, "is_frozen", false);
        flagsToRestore.set(partyKey(p.doctype, p.name), { ...p, ...flags });
      }
    } catch (err) {
      console.log(`  party-check ${p.doctype}/${p.name}: ${(err as Error).message.slice(0, 200)}`);
    }
  });
  if (flagsToRestore.size > 0) {
    const nDisabled = Array.from(flagsToRestore.values()).filter((f) => f.disabled).length;
    const nFrozen = Array.from(flagsToRestore.values()).filter((f) => f.is_frozen).length;
    console.log(
      `Temporarily cleared flags on ${flagsToRestore.size} parties (disabled=${nDisabled}, frozen=${nFrozen}) — will restore after run.`,
    );
  }

  // ── Execute phase ──
  console.log(`\n── Executing ${allocateItems.length} allocations (concurrency=${args.concurrency}) ──`);
  console.log(`Log: ${logPath}`);

  let successCount = 0;
  let failCount = 0;

  try {
    await runWithConcurrency(allocateItems, args.concurrency, async (item) => {
      const start = Date.now();
      // Re-lookup the original PE row (planForPe only kept its name + a few fields)
      const original = candidates.find((c) => c.name === item.original);
      if (!original) {
        const entry: LogEntry = {
          original: item.original,
          status: "failed",
          reason: "original_not_in_candidate_cache",
          ts: new Date().toISOString(),
          durationMs: Date.now() - start,
        };
        fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
        failCount++;
        return;
      }

      try {
        const { amended, refCount } = await executeAllocation(erp, original);
        const entry: LogEntry = {
          original: item.original,
          amended,
          status: "success",
          refs: refCount,
          ts: new Date().toISOString(),
          durationMs: Date.now() - start,
        };
        fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
        successCount++;
        const msg = `[${successCount + failCount}/${allocateItems.length}] ${item.original} → ${amended}  ${fmt(item.pool)} ${original.paid_to_account_currency} (${refCount} refs)`;
        console.log(msg);
      } catch (err) {
        const reason = (err as Error).message.slice(0, 400);
        const entry: LogEntry = {
          original: item.original,
          status: "failed",
          reason,
          ts: new Date().toISOString(),
          durationMs: Date.now() - start,
        };
        fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
        failCount++;
        console.log(`[${successCount + failCount}/${allocateItems.length}] ${item.original} FAILED: ${reason}`);
      }
    });
  } finally {
    // ── Party flag restore post-pass ──
    // Runs in finally so a crash mid-execute still restores flags we touched.
    if (flagsToRestore.size > 0) {
      console.log(`\nRestoring flags on ${flagsToRestore.size} parties ...`);
      const restoreList = Array.from(flagsToRestore.values());
      await runWithConcurrency(restoreList, args.concurrency, async (p) => {
        try {
          if (p.disabled) await setPartyFlag(erp, p.doctype, p.name, "disabled", true);
          if (p.is_frozen) await setPartyFlag(erp, p.doctype, p.name, "is_frozen", true);
        } catch (err) {
          console.log(
            `  ⚠  restore ${p.doctype}/${p.name} FAILED: ${(err as Error).message.slice(0, 200)}`,
          );
        }
      });
    }
  }

  console.log(`\n── Done ── success=${successCount} fail=${failCount}`);
  console.log(`Log: ${logPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
