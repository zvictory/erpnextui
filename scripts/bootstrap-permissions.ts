/* eslint-disable no-console */
/**
 * Bootstrap capability grants for existing tenant users.
 *
 * Maps ERPNext roles → capability bundles, so the initial rollout doesn't
 * start with empty grants across the board. Run once per tenant via:
 *
 *   npx tsx scripts/bootstrap-permissions.ts --tenant=<tenant-id>
 *
 * After running, review the Users tab in the Permissions admin page and
 * refine scope assignments (particularly `line` and `warehouse` dims).
 */

import { db } from "@/db";
import { userCapabilities, permissionAudit } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenant } from "@/lib/config-store";
import type { CapabilityId } from "@/lib/permissions/capabilities";

const SCOPE_WILDCARD = "*";
const ACTOR = "bootstrap-script";

type Grant = { capability: CapabilityId; scopeDim: string; scopeValue?: string };
type RoleToGrants = Record<string, Grant[]>;

const ROLE_MAP: RoleToGrants = {
  "System Manager": [
    { capability: "platform.admin", scopeDim: "*" },
    { capability: "dashboard.read", scopeDim: "*" },
    { capability: "settings.read", scopeDim: "*" },
    { capability: "settings.write", scopeDim: "*" },
  ],
  "Sales User": [
    { capability: "sales_invoice.read", scopeDim: "*" },
    { capability: "sales_invoice.create", scopeDim: "*" },
    { capability: "dashboard.read", scopeDim: "*" },
  ],
  "Sales Manager": [
    { capability: "sales_invoice.read", scopeDim: "*" },
    { capability: "sales_invoice.create", scopeDim: "*" },
    { capability: "sales_invoice.submit", scopeDim: "*" },
    { capability: "dashboard.read", scopeDim: "*" },
  ],
  "Purchase User": [
    { capability: "purchase_invoice.read", scopeDim: "*" },
    { capability: "purchase_invoice.create", scopeDim: "*" },
  ],
  "Stock User": [
    { capability: "warehouse.read", scopeDim: "warehouse", scopeValue: SCOPE_WILDCARD },
    { capability: "stock_entry.create", scopeDim: "warehouse", scopeValue: SCOPE_WILDCARD },
  ],
  "Stock Manager": [
    { capability: "warehouse.read", scopeDim: "warehouse", scopeValue: SCOPE_WILDCARD },
    { capability: "warehouse.manage", scopeDim: "warehouse", scopeValue: SCOPE_WILDCARD },
    { capability: "stock_entry.create", scopeDim: "warehouse", scopeValue: SCOPE_WILDCARD },
  ],
  "Manufacturing User": [
    { capability: "production.read", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "production.create", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "downtime.read", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "downtime.write", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "product.read", scopeDim: "*" },
  ],
  "Manufacturing Manager": [
    { capability: "production.read", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "production.create", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "production.update", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "production.submit", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "downtime.read", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "downtime.write", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "lines.manage", scopeDim: "line", scopeValue: SCOPE_WILDCARD },
    { capability: "product.read", scopeDim: "*" },
    { capability: "product.write", scopeDim: "*" },
    { capability: "energy.read", scopeDim: "*" },
    { capability: "energy.write", scopeDim: "*" },
  ],
};

const FALLBACK: Grant[] = [{ capability: "dashboard.read", scopeDim: "*" }];

type ErpFetch = <T>(endpoint: string) => Promise<T>;

function makeErpFetch(tenantUrl: string, apiKey: string): ErpFetch {
  return async <T>(endpoint: string): Promise<T> => {
    const url = `${tenantUrl.replace(/\/$/, "")}${endpoint}`;
    const resp = await fetch(url, {
      headers: { Authorization: `token ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      throw new Error(`ERPNext ${endpoint} → HTTP ${resp.status}`);
    }
    return (await resp.json()) as T;
  };
}

async function fetchTenantUsers(erp: ErpFetch): Promise<string[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "enabled"]),
    filters: JSON.stringify([
      ["enabled", "=", 1],
      ["name", "not in", ["Administrator", "Guest"]],
    ]),
    limit_page_length: "500",
  });
  const resp = await erp<{ data: Array<{ name: string }> }>(
    `/api/resource/User?${params}`,
  );
  return resp.data.map((u) => u.name);
}

async function fetchUserRoles(erp: ErpFetch, email: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      doctype: "Has Role",
      fields: JSON.stringify(["role"]),
      filters: JSON.stringify([
        ["parent", "=", email],
        ["parenttype", "=", "User"],
      ]),
      limit_page_length: "500",
    });
    const resp = await erp<{ message: Array<{ role: string }> }>(
      `/api/method/frappe.client.get_list?${params}`,
    );
    return (resp.message ?? []).map((r) => r.role);
  } catch (err) {
    console.error(`  ⚠  Failed to read roles for ${email}:`, err);
    return [];
  }
}

async function bootstrapTenant(tenantId: string) {
  const tenant = getTenant(tenantId);
  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    process.exit(1);
  }

  const erp = makeErpFetch(tenant.url, tenant.apiKey);
  console.log(`Fetching user list from ${tenant.url} ...`);
  const emails = await fetchTenantUsers(erp);
  console.log(`Bootstrapping ${emails.length} users for tenant ${tenantId}`);

  for (const rawEmail of emails) {
    const email = rawEmail.toLowerCase();
    const existing = await db
      .select({ id: userCapabilities.id })
      .from(userCapabilities)
      .where(
        and(eq(userCapabilities.tenant, tenantId), eq(userCapabilities.userEmail, email)),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⊙ ${email}: already has grants, skipping`);
      continue;
    }

    const roles = await fetchUserRoles(erp, rawEmail);
    const capSet = new Map<
      string,
      { capability: CapabilityId; scopeDim: string; scopeValue: string }
    >();

    for (const role of roles) {
      const grants = ROLE_MAP[role] ?? [];
      for (const g of grants) {
        const value = g.scopeValue ?? SCOPE_WILDCARD;
        capSet.set(`${g.capability}::${g.scopeDim}::${value}`, {
          capability: g.capability,
          scopeDim: g.scopeDim,
          scopeValue: value,
        });
      }
    }

    if (capSet.size === 0) {
      for (const g of FALLBACK) {
        capSet.set(`${g.capability}::${g.scopeDim}::${SCOPE_WILDCARD}`, {
          capability: g.capability,
          scopeDim: g.scopeDim,
          scopeValue: SCOPE_WILDCARD,
        });
      }
    }

    db.transaction((tx) => {
      for (const g of capSet.values()) {
        tx.insert(userCapabilities)
          .values({
            tenant: tenantId,
            userEmail: email,
            capabilityId: g.capability,
            scopeDim: g.scopeDim,
            scopeValue: g.scopeValue,
            grantedBy: ACTOR,
          })
          .run();
        tx.insert(permissionAudit)
          .values({
            event: "grant",
            tenant: tenantId,
            userEmail: email,
            capabilityId: g.capability,
            scopeDim: g.scopeDim,
            scopeValue: g.scopeValue,
            actorEmail: ACTOR,
            details: JSON.stringify({ source: "bootstrap", roles }),
          })
          .run();
      }
    });

    console.log(
      `  ✓ ${email}: ${capSet.size} grants from roles [${roles.join(", ") || "none"}]`,
    );
  }

  console.log(
    "\nDone. Review the admin UI at /settings/permissions before flipping enforce mode.",
  );
}

const tenantArg = process.argv.find((a) => a.startsWith("--tenant="))?.split("=")[1];
if (!tenantArg) {
  console.error("Usage: tsx scripts/bootstrap-permissions.ts --tenant=<tenant-id>");
  process.exit(1);
}

bootstrapTenant(tenantArg).catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
