# Module Toggle + Serial Number / IMEI Tracking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tenant-based module group toggling via admin panel, and full Serial Number / IMEI tracking UI for phone shop tenants.

**Architecture:** Module groups are a shared constant mapping group keys → routes. Admin panel stores `enabledModuleGroups` per tenant in `data/config.json`. A new `/api/tenant-modules` endpoint returns the enabled groups for the current user's tenant, consumed by a `useEnabledModules()` hook. Sidebar and route guard filter by enabled groups. Serial Number CRUD uses ERPNext's existing `Serial No` doctype with `custom_imei_1`/`custom_imei_2` custom fields. Stock entry form gains a serial number sub-table for serialized items.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Zustand 5, React Query 5, shadcn/ui, Zod 4, next-intl, sonner toasts

**Design doc:** `docs/plans/2026-03-13-module-toggle-serial-tracking-design.md`

---

## Phase 1: Module Toggle Foundation

### Task 1: Create module groups constant

**Files:**
- Create: `src/lib/module-groups.ts`

**Step 1: Create the module groups definition**

```typescript
// src/lib/module-groups.ts

export type ModuleGroupKey =
  | "main"
  | "master-data"
  | "transactions"
  | "stock"
  | "serial-tracking"
  | "accounting"
  | "reports";

export interface ModuleGroup {
  label: string;
  description: string;
  routes: string[];
  alwaysEnabled?: boolean;
}

export const MODULE_GROUPS: Record<ModuleGroupKey, ModuleGroup> = {
  main: {
    label: "Main",
    description: "Dashboard, Expenses, Fund Transfer",
    routes: ["/dashboard", "/expenses", "/funds"],
    alwaysEnabled: true,
  },
  "master-data": {
    label: "Master Data",
    description: "Products, Customers, Vendors, Employees",
    routes: ["/products", "/customers", "/vendors", "/employees"],
  },
  transactions: {
    label: "Transactions",
    description: "Quotations, Orders, Invoices, Payments",
    routes: [
      "/quotations",
      "/sales-orders",
      "/delivery-notes",
      "/sales-invoices",
      "/purchase-orders",
      "/purchase-invoices",
      "/payments",
    ],
  },
  stock: {
    label: "Stock",
    description: "Warehouses, Stock Entries, Stock Ledger",
    routes: ["/warehouses", "/stock-entries", "/stock-ledger"],
  },
  "serial-tracking": {
    label: "Serial Tracking",
    description: "Serial Numbers, IMEI Codes",
    routes: ["/serial-numbers"],
  },
  accounting: {
    label: "Accounting",
    description: "Banks, Chart of Accounts",
    routes: ["/banks", "/chart-of-accounts"],
  },
  reports: {
    label: "Reports",
    description: "Sales, P&L, Balance Sheet, Trial Balance, Cash Flow, AR, AP, General Ledger",
    routes: ["/reports"],
  },
};

export const ALL_MODULE_GROUP_KEYS = Object.keys(MODULE_GROUPS) as ModuleGroupKey[];

/**
 * Check if a route path is enabled given a set of enabled module group keys.
 * If enabledGroups is empty/undefined, all modules are enabled (backward compat).
 */
export function isRouteEnabled(pathname: string, enabledGroups?: ModuleGroupKey[]): boolean {
  // No config = all enabled (backward compat)
  if (!enabledGroups || enabledGroups.length === 0) return true;

  for (const [key, group] of Object.entries(MODULE_GROUPS)) {
    if (group.alwaysEnabled) continue;
    for (const route of group.routes) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        return enabledGroups.includes(key as ModuleGroupKey);
      }
    }
  }

  // Routes not in any group (e.g. /settings, /ledger) are always accessible
  return true;
}

/**
 * Given a sidebar group's labelKey and the enabled groups, return whether the group should show.
 */
export function isSidebarGroupEnabled(
  sidebarLabelKey: string,
  enabledGroups?: ModuleGroupKey[],
): boolean {
  if (!enabledGroups || enabledGroups.length === 0) return true;

  // Map sidebar group labels to module group keys
  const labelToKey: Record<string, ModuleGroupKey> = {
    main: "main",
    masterData: "master-data",
    transactions: "transactions",
    stock: "stock",
    serialTracking: "serial-tracking",
    accounting: "accounting",
    reports: "reports",
  };

  const key = labelToKey[sidebarLabelKey];
  if (!key) return true; // Unknown group = always show
  if (MODULE_GROUPS[key].alwaysEnabled) return true;
  return enabledGroups.includes(key);
}
```

**Step 2: Commit**

```bash
git add src/lib/module-groups.ts
git commit -m "feat: add module groups constant with route mapping"
```

---

### Task 2: Extend TenantConfig and schemas for enabledModuleGroups

**Files:**
- Modify: `src/lib/config-store.ts` — add `enabledModuleGroups` to `TenantConfig`
- Modify: `src/lib/schemas/admin-schemas.ts` — add field to tenant schemas

**Step 1: Add `enabledModuleGroups` to TenantConfig interface**

In `src/lib/config-store.ts`, add to the `TenantConfig` interface:

```typescript
export interface TenantConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  enabledModuleGroups?: string[]; // NEW — undefined = all enabled
  createdAt: string;
  updatedAt: string;
}
```

**Step 2: Add to tenant schemas**

In `src/lib/schemas/admin-schemas.ts`, update `tenantSchema`:

```typescript
export const tenantSchema = z.object({
  id: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  name: z.string().min(1, "Display name is required"),
  url: z.url("Must be a valid URL"),
  apiKey: z.string().min(1, "API key is required"),
  enabled: z.boolean().default(true),
  enabledModuleGroups: z.array(z.string()).optional(),
});
```

The `tenantUpdateSchema` (which uses `.partial().omit({ id: true })`) will automatically include `enabledModuleGroups` as optional.

**Step 3: Commit**

```bash
git add src/lib/config-store.ts src/lib/schemas/admin-schemas.ts
git commit -m "feat: extend TenantConfig and schema with enabledModuleGroups"
```

---

### Task 3: Create /api/tenant-modules endpoint

**Files:**
- Create: `src/app/api/tenant-modules/route.ts`

This endpoint resolves the current user's tenant from the auth store's site URL and returns enabled module groups.

**Step 1: Create the route**

```typescript
// src/app/api/tenant-modules/route.ts

import { NextRequest, NextResponse } from "next/server";
import { readConfig, configExists } from "@/lib/config-store";

export async function GET(req: NextRequest) {
  const siteUrl = req.headers.get("x-frappe-site") ?? "";

  if (!siteUrl || !configExists()) {
    // No config or no site header = all modules enabled
    return NextResponse.json({ enabledModuleGroups: [] });
  }

  const config = readConfig();
  const tenant = config.tenants.find((t) => t.url === siteUrl);

  if (!tenant) {
    // Unknown tenant = all modules enabled
    return NextResponse.json({ enabledModuleGroups: [] });
  }

  return NextResponse.json({
    enabledModuleGroups: tenant.enabledModuleGroups ?? [],
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/tenant-modules/route.ts
git commit -m "feat: add /api/tenant-modules endpoint"
```

---

### Task 4: Create useEnabledModules hook

**Files:**
- Create: `src/hooks/use-enabled-modules.ts`
- Modify: `src/hooks/query-keys.ts` — add `enabledModules` key

**Step 1: Add query key**

In `src/hooks/query-keys.ts`, add inside the `queryKeys` object:

```typescript
enabledModules: {
  current: (siteUrl: string) => ["enabledModules", siteUrl] as const,
},
```

**Step 2: Create the hook**

```typescript
// src/hooks/use-enabled-modules.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { ModuleGroupKey } from "@/lib/module-groups";

interface TenantModulesResponse {
  enabledModuleGroups: string[];
}

export function useEnabledModules() {
  const siteUrl = useAuthStore((s) => s.siteUrl);

  const { data } = useQuery({
    queryKey: queryKeys.enabledModules.current(siteUrl),
    queryFn: async (): Promise<ModuleGroupKey[]> => {
      const resp = await fetch("/api/tenant-modules", {
        headers: { "x-frappe-site": siteUrl },
      });
      if (!resp.ok) return [];
      const json: TenantModulesResponse = await resp.json();
      return (json.enabledModuleGroups ?? []) as ModuleGroupKey[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!siteUrl,
  });

  return data; // undefined while loading, [] means all enabled
}
```

**Step 3: Commit**

```bash
git add src/hooks/query-keys.ts src/hooks/use-enabled-modules.ts
git commit -m "feat: add useEnabledModules hook with query key"
```

---

### Task 5: Add module checkboxes to admin tenant form

**Files:**
- Modify: `src/components/admin/tenant-form.tsx`

**Step 1: Add state and UI for module group checkboxes**

Add after the existing `enabled` state:

```typescript
const [enabledModuleGroups, setEnabledModuleGroups] = useState<string[]>([]);
```

Import `MODULE_GROUPS`, `ALL_MODULE_GROUP_KEYS`, and `Checkbox` component.

In the `useEffect` that loads tenant data, add:

```typescript
setEnabledModuleGroups(t.enabledModuleGroups ?? [...ALL_MODULE_GROUP_KEYS]);
```

For new tenant, initialize with all keys:

```typescript
// Outside useEffect — default for create mode
const [enabledModuleGroups, setEnabledModuleGroups] = useState<string[]>([...ALL_MODULE_GROUP_KEYS]);
```

Add UI section after the enabled Switch, before the error display:

```tsx
<div className="flex flex-col gap-2">
  <Label>Enabled Modules</Label>
  <div className="space-y-2">
    {ALL_MODULE_GROUP_KEYS.map((key) => {
      const group = MODULE_GROUPS[key];
      const isAlwaysOn = group.alwaysEnabled;
      const checked = isAlwaysOn || enabledModuleGroups.includes(key);
      return (
        <label key={key} className="flex items-start gap-3">
          <Checkbox
            checked={checked}
            disabled={isBusy || isAlwaysOn}
            onCheckedChange={(v) => {
              if (isAlwaysOn) return;
              setEnabledModuleGroups((prev) =>
                v ? [...prev, key] : prev.filter((k) => k !== key),
              );
            }}
          />
          <div className="space-y-0.5">
            <span className="text-sm font-medium leading-none">
              {group.label}
              {isAlwaysOn && (
                <span className="ml-1 text-xs text-muted-foreground">(always on)</span>
              )}
            </span>
            <p className="text-xs text-muted-foreground">{group.description}</p>
          </div>
        </label>
      );
    })}
  </div>
</div>
```

Include `enabledModuleGroups` in both create and update mutation payloads:

```typescript
// In handleSubmit — create branch:
createMutation.mutate(
  { id: slug, name, url, apiKey, enabled, enabledModuleGroups },
  // ...
);

// In handleSubmit — update branch:
const updates: Record<string, unknown> = {
  id: tenantId!, name, url, enabled, enabledModuleGroups,
};
```

**Step 2: Commit**

```bash
git add src/components/admin/tenant-form.tsx
git commit -m "feat: add module group checkboxes to tenant form"
```

---

### Task 6: Filter sidebar by enabled modules

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Add serial tracking nav group and module filtering**

Add a new nav array after `stockNav`:

```typescript
const serialTrackingNav = [
  { tKey: "serialNumbers", href: "/serial-numbers", icon: Barcode, doctype: "Serial No" },
];
```

Import `Barcode` from lucide-react and `useEnabledModules` hook and `isSidebarGroupEnabled`.

In `AppSidebar`, call the hook:

```typescript
const enabledModules = useEnabledModules();
```

Wrap each `NavGroup` with a conditional using `isSidebarGroupEnabled`:

```tsx
<SidebarContent>
  <NavGroup labelKey="main" items={mainNav} />
  {isSidebarGroupEnabled("masterData", enabledModules) && (
    <NavGroup labelKey="masterData" items={masterDataNav} />
  )}
  {isSidebarGroupEnabled("transactions", enabledModules) && (
    <NavGroup labelKey="transactions" items={transactionNav} />
  )}
  {isSidebarGroupEnabled("stock", enabledModules) && (
    <NavGroup labelKey="stock" items={stockNav} />
  )}
  {isSidebarGroupEnabled("serialTracking", enabledModules) && (
    <NavGroup labelKey="serialTracking" items={serialTrackingNav} />
  )}
  {isSidebarGroupEnabled("accounting", enabledModules) && (
    <NavGroup labelKey="accounting" items={accountingNav} />
  )}
  {isSidebarGroupEnabled("reports", enabledModules) && (
    <NavGroup labelKey="reports" items={reportNav} />
  )}
</SidebarContent>
```

**Step 2: Add i18n keys**

Add to all 4 locale files (`messages/{en,ru,uz,uzc}.json`) under `nav`:

```json
"groups": {
  ...existing keys...,
  "serialTracking": "Serial Tracking"  // (translate per locale)
},
"serialNumbers": "Serial Numbers"  // (translate per locale)
```

**Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx messages/
git commit -m "feat: filter sidebar groups by enabled modules"
```

---

### Task 7: Add route guard for disabled modules

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Step 1: Add module guard component**

Create a `ModuleGuard` component inside the layout file that wraps children:

```typescript
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEnabledModules } from "@/hooks/use-enabled-modules";
import { isRouteEnabled } from "@/lib/module-groups";

function ModuleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const enabledModules = useEnabledModules();

  useEffect(() => {
    // Only check once modules data has loaded (undefined = still loading)
    if (enabledModules === undefined) return;
    if (!isRouteEnabled(pathname, enabledModules)) {
      router.replace("/dashboard");
    }
  }, [pathname, enabledModules, router]);

  return <>{children}</>;
}
```

Wrap `{children}` in the existing layout:

```tsx
<main className="flex-1 min-h-0 p-4 md:p-6">
  <ModuleGuard>{children}</ModuleGuard>
</main>
```

**Step 2: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: add route guard for disabled module groups"
```

---

## Phase 2: Serial Number Types & Hooks

### Task 8: Create serial number types

**Files:**
- Create: `src/types/serial-number.ts`

**Step 1: Create the types file**

```typescript
// src/types/serial-number.ts

export interface SerialNumber {
  name: string;
  serial_no: string;
  item_code: string;
  item_name?: string;
  warehouse?: string;
  company: string;
  status: "Active" | "Delivered" | "Expired" | "Inactive";
  custom_imei_1?: string;
  custom_imei_2?: string;
  purchase_document_type?: string;
  purchase_document_no?: string;
  delivery_document_type?: string;
  delivery_document_no?: string;
  [key: string]: unknown;
}

export interface SerialNumberListItem {
  name: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  status: string;
  custom_imei_1: string;
  custom_imei_2: string;
}
```

**Step 2: Commit**

```bash
git add src/types/serial-number.ts
git commit -m "feat: add SerialNumber types"
```

---

### Task 9: Add serial number query keys and hook

**Files:**
- Modify: `src/hooks/query-keys.ts` — add `serialNumbers` keys
- Create: `src/hooks/use-serial-numbers.ts`

**Step 1: Add query keys**

In `src/hooks/query-keys.ts`, add to the `queryKeys` object:

```typescript
serialNumbers: {
  list: (company: string, page: number, search: string, sort: string) =>
    ["serialNumbers", "list", company, page, search, sort] as const,
  count: (company: string, search: string) =>
    ["serialNumbers", "count", company, search] as const,
  detail: (name: string) => ["serialNumbers", "detail", name] as const,
},
```

**Step 2: Create the hook**

```typescript
// src/hooks/use-serial-numbers.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { SerialNumber, SerialNumberListItem } from "@/types/serial-number";

const PAGE_SIZE = 20;

const LIST_FIELDS: (keyof SerialNumberListItem)[] = [
  "name",
  "item_code",
  "item_name",
  "warehouse",
  "status",
  "custom_imei_1",
  "custom_imei_2",
];

export function useSerialNumberList(
  company: string,
  page: number,
  search: string,
  sort: string,
) {
  return useQuery({
    queryKey: queryKeys.serialNumbers.list(company, page, search, sort),
    queryFn: async () => {
      if (!search) {
        return frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [["company", "=", company]],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
          limitStart: (page - 1) * PAGE_SIZE,
        });
      }

      // Two-query IMEI search: search by name/item_code, IMEI-1, IMEI-2
      const likeFilter = `%${search}%`;
      const [byName, byImei1, byImei2] = await Promise.all([
        frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [
            ["company", "=", company],
            ["name", "like", likeFilter],
          ],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
          limitStart: (page - 1) * PAGE_SIZE,
        }),
        frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [
            ["company", "=", company],
            ["custom_imei_1", "like", likeFilter],
          ],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
        }),
        frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [
            ["company", "=", company],
            ["custom_imei_2", "like", likeFilter],
          ],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
        }),
      ]);

      // Deduplicate
      const seen = new Set<string>();
      const merged: SerialNumberListItem[] = [];
      for (const item of [...byName, ...byImei1, ...byImei2]) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          merged.push(item);
        }
      }
      return merged.slice(0, PAGE_SIZE);
    },
    enabled: !!company,
  });
}

export function useSerialNumberCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.serialNumbers.count(company, search),
    queryFn: async () => {
      if (!search) {
        return frappe.getCount("Serial No", [["company", "=", company]]);
      }
      // For search, approximate count from merged results
      const likeFilter = `%${search}%`;
      const [c1, c2, c3] = await Promise.all([
        frappe.getCount("Serial No", [
          ["company", "=", company],
          ["name", "like", likeFilter],
        ]),
        frappe.getCount("Serial No", [
          ["company", "=", company],
          ["custom_imei_1", "like", likeFilter],
        ]),
        frappe.getCount("Serial No", [
          ["company", "=", company],
          ["custom_imei_2", "like", likeFilter],
        ]),
      ]);
      // Upper bound (may have duplicates, but good enough for pagination)
      return c1 + c2 + c3;
    },
    enabled: !!company,
  });
}

export function useSerialNumber(name: string) {
  return useQuery({
    queryKey: queryKeys.serialNumbers.detail(name),
    queryFn: () => frappe.getDoc<SerialNumber>("Serial No", name),
    enabled: !!name,
  });
}

export function useCreateSerialNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      serial_no: string;
      item_code: string;
      company: string;
      custom_imei_1?: string;
      custom_imei_2?: string;
    }) =>
      frappe.createDoc<SerialNumber>("Serial No", {
        doctype: "Serial No",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["serialNumbers"] });
    },
  });
}

export function useUpdateSerialNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      data,
    }: {
      name: string;
      data: { custom_imei_1?: string; custom_imei_2?: string };
    }) => {
      return frappe.updateDoc<SerialNumber>("Serial No", name, data);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["serialNumbers"] });
      qc.invalidateQueries({
        queryKey: queryKeys.serialNumbers.detail(variables.name),
      });
    },
  });
}

/**
 * Batch-update IMEI codes on multiple serial numbers.
 * Used after stock entry submission.
 * Returns array of { serial_no, success, error? }.
 */
export async function batchUpdateIMEI(
  updates: { serial_no: string; custom_imei_1?: string; custom_imei_2?: string }[],
): Promise<{ serial_no: string; success: boolean; error?: string }[]> {
  return Promise.all(
    updates.map(async ({ serial_no, ...data }) => {
      try {
        await frappe.updateDoc("Serial No", serial_no, data);
        return { serial_no, success: true };
      } catch (err) {
        return {
          serial_no,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }),
  );
}
```

**Step 3: Commit**

```bash
git add src/hooks/query-keys.ts src/hooks/use-serial-numbers.ts
git commit -m "feat: add serial number query keys and CRUD hooks"
```

---

### Task 10: Extend Item type and StockEntryDetail type

**Files:**
- Modify: `src/types/item.ts` — add `has_serial_no`
- Modify: `src/types/stock-entry.ts` — add `serial_no` to `StockEntryDetail`
- Modify: `src/hooks/use-items.ts` — fetch `has_serial_no` field

**Step 1: Extend Item type**

In `src/types/item.ts`, add to `Item` interface:

```typescript
has_serial_no: 0 | 1;
```

Add to `ItemListItem` interface:

```typescript
has_serial_no: 0 | 1;
```

**Step 2: Extend StockEntryDetail type**

In `src/types/stock-entry.ts`, add to `StockEntryDetail` interface:

```typescript
serial_no?: string; // Newline-separated serial numbers
```

**Step 3: Add `has_serial_no` to item list query fields**

In `src/hooks/use-items.ts`, update `useItemList`:

```typescript
fields: ["name", "item_code", "item_name", "item_group", "standard_rate", "disabled", "has_serial_no"],
```

**Step 4: Commit**

```bash
git add src/types/item.ts src/types/stock-entry.ts src/hooks/use-items.ts
git commit -m "feat: extend Item and StockEntryDetail types for serial tracking"
```

---

## Phase 3: Serial Numbers UI

### Task 11: Create serial number list columns

**Files:**
- Create: `src/components/serial-numbers/serial-columns.tsx`

**Step 1: Create the columns definition**

Follow the pattern from `src/components/products/product-columns.tsx`:

```tsx
// src/components/serial-numbers/serial-columns.tsx
"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@/components/shared/data-table";
import type { SerialNumberListItem } from "@/types/serial-number";

type TFunc = (key: string) => string;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  Active: "default",
  Delivered: "secondary",
  Expired: "outline",
  Inactive: "outline",
};

export function getSerialNumberColumns(t: TFunc): ColumnDef<SerialNumberListItem>[] {
  return [
    {
      key: "name",
      header: t("serialNo"),
      sortKey: "name",
      render: (row) => (
        <Link
          href={`/serial-numbers/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "item_code",
      header: t("item"),
      render: (row) => (
        <span>
          {row.item_code}
          {row.item_name && row.item_name !== row.item_code && (
            <span className="ml-1 text-muted-foreground">— {row.item_name}</span>
          )}
        </span>
      ),
    },
    {
      key: "custom_imei_1",
      header: "IMEI 1",
      render: (row) => (
        <span className="font-mono text-xs">{row.custom_imei_1 || "—"}</span>
      ),
    },
    {
      key: "custom_imei_2",
      header: "IMEI 2",
      render: (row) => (
        <span className="font-mono text-xs">{row.custom_imei_2 || "—"}</span>
      ),
    },
    {
      key: "warehouse",
      header: t("warehouse"),
      render: (row) => row.warehouse || "—",
    },
    {
      key: "status",
      header: t("status"),
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/serial-numbers/${encodeURIComponent(row.name)}`}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("edit")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
```

**Step 2: Commit**

```bash
git add src/components/serial-numbers/serial-columns.tsx
git commit -m "feat: add serial number DataTable column definitions"
```

---

### Task 12: Create serial number list page

**Files:**
- Create: `src/app/(app)/serial-numbers/page.tsx`

**Step 1: Create the list page**

Follow the pattern from `src/app/(app)/products/page.tsx`:

```tsx
// src/app/(app)/serial-numbers/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/shared/data-table";
import { getSerialNumberColumns } from "@/components/serial-numbers/serial-columns";
import {
  useSerialNumberList,
  useSerialNumberCount,
} from "@/hooks/use-serial-numbers";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import type { SerialNumberListItem } from "@/types/serial-number";

export default function SerialNumbersPage() {
  const t = useTranslations("serialNumbers");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("creation desc");

  const { data: serials = [], isLoading } = useSerialNumberList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useSerialNumberCount(
    company,
    listState.debouncedSearch,
  );

  const columns = getSerialNumberColumns(t);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      <DataTable<SerialNumberListItem>
        columns={columns}
        data={serials}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchPlaceholder")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) =>
          router.push(`/serial-numbers/${encodeURIComponent(row.name)}`)
        }
      />
    </div>
  );
}
```

**Step 2: Add i18n keys**

Add `serialNumbers` namespace to all 4 locale files (`messages/{en,ru,uz,uzc}.json`):

```json
"serialNumbers": {
  "title": "Serial Numbers",
  "searchPlaceholder": "Search by serial no, IMEI...",
  "serialNo": "Serial No",
  "item": "Item",
  "warehouse": "Warehouse",
  "status": "Status",
  "edit": "Edit",
  "imei1": "IMEI 1",
  "imei2": "IMEI 2",
  "save": "Save",
  "saved": "IMEI codes saved",
  "detailTitle": "Serial Number Details",
  "imeiCodes": "IMEI Codes"
}
```

(Translate appropriately for ru, uz, uzc locales.)

**Step 3: Commit**

```bash
git add src/app/(app)/serial-numbers/page.tsx messages/
git commit -m "feat: add serial number list page with IMEI search"
```

---

### Task 13: Create serial number detail/edit page

**Files:**
- Create: `src/components/serial-numbers/imei-edit-form.tsx`
- Create: `src/app/(app)/serial-numbers/[id]/page.tsx`

**Step 1: Create the IMEI edit form**

```tsx
// src/components/serial-numbers/imei-edit-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSerialNumber } from "@/hooks/use-serial-numbers";

interface IMEIEditFormProps {
  serialName: string;
  initialImei1?: string;
  initialImei2?: string;
}

export function IMEIEditForm({ serialName, initialImei1, initialImei2 }: IMEIEditFormProps) {
  const t = useTranslations("serialNumbers");
  const [imei1, setImei1] = useState(initialImei1 ?? "");
  const [imei2, setImei2] = useState(initialImei2 ?? "");
  const updateSerial = useUpdateSerialNumber();

  useEffect(() => {
    setImei1(initialImei1 ?? "");
    setImei2(initialImei2 ?? "");
  }, [initialImei1, initialImei2]);

  const hasChanges =
    imei1 !== (initialImei1 ?? "") || imei2 !== (initialImei2 ?? "");

  function handleSave() {
    updateSerial.mutate(
      { name: serialName, data: { custom_imei_1: imei1, custom_imei_2: imei2 } },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="imei1">{t("imei1")}</Label>
        <Input
          id="imei1"
          value={imei1}
          onChange={(e) => setImei1(e.target.value)}
          placeholder="350999999999999"
          maxLength={20}
          className="font-mono"
          disabled={updateSerial.isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="imei2">{t("imei2")}</Label>
        <Input
          id="imei2"
          value={imei2}
          onChange={(e) => setImei2(e.target.value)}
          placeholder="350999999999999"
          maxLength={20}
          className="font-mono"
          disabled={updateSerial.isPending}
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={!hasChanges || updateSerial.isPending}
      >
        {updateSerial.isPending ? "Saving..." : t("save")}
      </Button>
    </div>
  );
}
```

**Step 2: Create the detail page**

```tsx
// src/app/(app)/serial-numbers/[id]/page.tsx
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { IMEIEditForm } from "@/components/serial-numbers/imei-edit-form";
import { useSerialNumber } from "@/hooks/use-serial-numbers";
import { Loader2 } from "lucide-react";

export default function SerialNumberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const t = useTranslations("serialNumbers");
  const { data: serial, isLoading } = useSerialNumber(name);

  if (isLoading) {
    return (
      <FormPageLayout title={t("detailTitle")} backHref="/serial-numbers">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </FormPageLayout>
    );
  }

  if (!serial) {
    return (
      <FormPageLayout title={t("detailTitle")} backHref="/serial-numbers">
        <p className="text-muted-foreground">Serial number not found.</p>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title={serial.name} backHref="/serial-numbers">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("detailTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">{t("serialNo")}</Label>
                <p className="font-medium">{serial.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("status")}</Label>
                <div className="mt-0.5">
                  <Badge
                    variant={
                      serial.status === "Active"
                        ? "default"
                        : serial.status === "Delivered"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {serial.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("item")}</Label>
                <p className="font-medium">
                  {serial.item_code}
                  {serial.item_name && serial.item_name !== serial.item_code && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      — {serial.item_name}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("warehouse")}</Label>
                <p className="font-medium">{serial.warehouse || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("imeiCodes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <IMEIEditForm
              serialName={serial.name}
              initialImei1={serial.custom_imei_1}
              initialImei2={serial.custom_imei_2}
            />
          </CardContent>
        </Card>
      </div>
    </FormPageLayout>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/serial-numbers/imei-edit-form.tsx src/app/(app)/serial-numbers/[id]/page.tsx
git commit -m "feat: add serial number detail page with IMEI edit"
```

---

## Phase 4: Stock Entry Integration

### Task 14: Create serial entry table component

**Files:**
- Create: `src/components/serial-numbers/serial-entry-table.tsx`

**Step 1: Create the component**

This is a sub-table that appears inside a stock entry line item row when the item has `has_serial_no = 1`.

```tsx
// src/components/serial-numbers/serial-entry-table.tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface SerialEntryRow {
  serial_no: string;
  custom_imei_1: string;
  custom_imei_2: string;
}

interface SerialEntryTableProps {
  rows: SerialEntryRow[];
  onChange: (rows: SerialEntryRow[]) => void;
  requiredQty: number;
  disabled?: boolean;
}

function emptySerialRow(): SerialEntryRow {
  return { serial_no: "", custom_imei_1: "", custom_imei_2: "" };
}

export function SerialEntryTable({
  rows,
  onChange,
  requiredQty,
  disabled,
}: SerialEntryTableProps) {
  function updateRow(index: number, field: keyof SerialEntryRow, value: string) {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    );
    onChange(updated);
  }

  function addRow() {
    onChange([...rows, emptySerialRow()]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  const mismatch = rows.length !== requiredQty;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Serial Numbers
          {mismatch && (
            <span className="ml-2 text-xs text-destructive">
              ({rows.length}/{requiredQty} — must match qty)
            </span>
          )}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Serial No</TableHead>
              <TableHead>IMEI 1</TableHead>
              <TableHead>IMEI 2</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No serial numbers added
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <Input
                      value={row.serial_no}
                      onChange={(e) => updateRow(index, "serial_no", e.target.value)}
                      placeholder="e.g. PHONE-0001"
                      disabled={disabled}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.custom_imei_1}
                      onChange={(e) => updateRow(index, "custom_imei_1", e.target.value)}
                      placeholder="IMEI 1"
                      disabled={disabled}
                      className="h-8 font-mono text-xs"
                      maxLength={20}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.custom_imei_2}
                      onChange={(e) => updateRow(index, "custom_imei_2", e.target.value)}
                      placeholder="IMEI 2"
                      disabled={disabled}
                      className="h-8 font-mono text-xs"
                      maxLength={20}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeRow(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/serial-numbers/serial-entry-table.tsx
git commit -m "feat: add serial entry table component for stock entries"
```

---

### Task 15: Integrate serial tracking into stock entry form

**Files:**
- Modify: `src/app/(app)/stock-entries/new/page.tsx`
- Modify: `src/hooks/use-stock-entries.ts`

This is the most complex task. The stock entry form needs to:
1. Check if each selected item has `has_serial_no = 1` (query the item)
2. Show the serial entry sub-table for serialized items
3. Collect serial_no strings and IMEI data
4. On submit: pass serial_no to stock entry, then batch-update IMEI codes

**Step 1: Extend the ItemRow type and add serial state**

In `src/app/(app)/stock-entries/new/page.tsx`, extend `ItemRow`:

```typescript
interface ItemRow {
  item_code: string;
  qty: number;
  basic_rate: number;
  uom: string;
  s_warehouse: string;
  t_warehouse: string;
  has_serial_no: boolean;                      // NEW
  serials: SerialEntryRow[];                    // NEW
}

function emptyRow(): ItemRow {
  return {
    item_code: "", qty: 1, basic_rate: 0, uom: "Nos",
    s_warehouse: "", t_warehouse: "",
    has_serial_no: false, serials: [],          // NEW
  };
}
```

Import `SerialEntryTable` and `SerialEntryRow` from `@/components/serial-numbers/serial-entry-table`, and `batchUpdateIMEI` from `@/hooks/use-serial-numbers`, and `frappe` from `@/lib/frappe-client`.

**Step 2: Add item lookup on item_code change**

When user selects an item via LinkField, look up whether it has serial_no:

```typescript
async function handleItemChange(index: number, itemCode: string) {
  updateItem(index, "item_code", itemCode);
  if (itemCode) {
    try {
      const item = await frappe.getDoc<{ has_serial_no: 0 | 1 }>("Item", itemCode);
      setItems((prev) =>
        prev.map((row, i) =>
          i === index ? { ...row, has_serial_no: item.has_serial_no === 1 } : row,
        ),
      );
    } catch {
      // Item not found or no access — treat as not serialized
    }
  }
}
```

Replace the LinkField `onChange` for item_code to use `handleItemChange`.

**Step 3: Show SerialEntryTable under serialized item rows**

After each `<TableRow>` in the items table, add a conditional expansion row:

```tsx
{item.has_serial_no && (
  <TableRow>
    <TableCell colSpan={entryType === "Material Transfer" ? 8 : 6} className="bg-muted/30 p-3">
      <SerialEntryTable
        rows={item.serials}
        onChange={(serials) =>
          setItems((prev) =>
            prev.map((r, i) => (i === index ? { ...r, serials } : r))
          )
        }
        requiredQty={item.qty}
        disabled={createEntry.isPending}
      />
    </TableCell>
  </TableRow>
)}
```

**Step 4: Update handleSubmit**

Validate serial counts match qty, build serial_no strings, and handle IMEI updates:

```typescript
function handleSubmit() {
  const validItems = items.filter((item) => item.item_code && item.qty > 0);
  if (validItems.length === 0) {
    toast.error(t("addItem"));
    return;
  }

  // Validate serial counts
  for (const item of validItems) {
    if (item.has_serial_no) {
      const validSerials = item.serials.filter((s) => s.serial_no);
      if (validSerials.length !== item.qty) {
        toast.error(
          `${item.item_code}: ${validSerials.length} serial numbers provided, ${item.qty} required`,
        );
        return;
      }
    }
  }

  // Collect IMEI updates for after submission
  const imeiUpdates: { serial_no: string; custom_imei_1?: string; custom_imei_2?: string }[] = [];

  const stockItems: StockEntryDetail[] = validItems.map((item) => {
    const serialNoStr = item.has_serial_no
      ? item.serials.map((s) => s.serial_no).join("\n")
      : undefined;

    // Collect IMEI data
    if (item.has_serial_no) {
      for (const s of item.serials) {
        if (s.custom_imei_1 || s.custom_imei_2) {
          imeiUpdates.push({
            serial_no: s.serial_no,
            custom_imei_1: s.custom_imei_1 || undefined,
            custom_imei_2: s.custom_imei_2 || undefined,
          });
        }
      }
    }

    return {
      doctype: "Stock Entry Detail" as const,
      item_code: item.item_code,
      qty: item.qty,
      basic_rate: item.basic_rate,
      amount: item.qty * item.basic_rate,
      uom: item.uom || "Nos",
      ...(serialNoStr ? { serial_no: serialNoStr } : {}),
      ...(showFrom ? { s_warehouse: /* existing logic */ } : {}),
      ...(showTo ? { t_warehouse: /* existing logic */ } : {}),
    };
  });

  createEntry.mutate(
    { /* existing payload */ items: stockItems },
    {
      onSuccess: async () => {
        // Step 2: Batch-update IMEI codes
        if (imeiUpdates.length > 0) {
          const results = await batchUpdateIMEI(imeiUpdates);
          const failures = results.filter((r) => !r.success);
          if (failures.length > 0) {
            toast.warning(
              `Stock received. ${failures.length} IMEI update(s) failed — edit them manually.`,
            );
          } else {
            toast.success(tc("submit"));
          }
        } else {
          toast.success(tc("submit"));
        }
        router.push("/stock-entries");
      },
      onError: (err) => toast.error(err.message),
    },
  );
}
```

**Note:** The `/* existing logic */` comments mean keep the existing warehouse assignment logic that's already in the file — just add the `serial_no` field conditionally.

**Step 5: Update `useCreateStockEntry` invalidation**

In `src/hooks/use-stock-entries.ts`, add serial number invalidation to `onSuccess`:

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["stockEntries"] });
  qc.invalidateQueries({ queryKey: ["bins"] });
  qc.invalidateQueries({ queryKey: ["stockLedger"] });
  qc.invalidateQueries({ queryKey: ["serialNumbers"] }); // NEW
},
```

Also add to `useCancelStockEntry`.

**Step 6: Commit**

```bash
git add src/app/(app)/stock-entries/new/page.tsx src/hooks/use-stock-entries.ts
git commit -m "feat: integrate serial number + IMEI entry into stock entry form"
```

---

## Phase 5: Final Wiring

### Task 16: Add "Serial No" to managed doctypes for permissions

**Files:**
- Modify: `src/hooks/use-permissions.ts` — add "Serial No" to MANAGED_DOCTYPES

**Step 1: Find and extend the MANAGED_DOCTYPES array**

Add `"Serial No"` to the array so sidebar permission filtering works for the serial numbers nav item.

**Step 2: Commit**

```bash
git add src/hooks/use-permissions.ts
git commit -m "feat: add Serial No to managed doctypes for permissions"
```

---

### Task 17: Build verification

**Step 1: Run lint**

```bash
npm run lint
```

Fix any TypeScript/ESLint errors.

**Step 2: Run build**

```bash
npm run build
```

Fix any build errors.

**Step 3: Run format**

```bash
npm run format
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix lint and formatting"
```

---

## Implementation Order & Dependencies

```
Task 1  (module-groups.ts)          — no deps
Task 2  (config + schema)           — no deps
Task 3  (/api/tenant-modules)       — depends on Task 2
Task 4  (useEnabledModules hook)    — depends on Task 3
Task 5  (admin tenant form)         — depends on Task 1, 2
Task 6  (sidebar filtering)         — depends on Task 1, 4
Task 7  (route guard)               — depends on Task 4
Task 8  (serial number types)       — no deps
Task 9  (serial number hooks)       — depends on Task 8
Task 10 (extend Item/StockEntry)    — no deps
Task 11 (serial columns)            — depends on Task 8
Task 12 (serial list page)          — depends on Task 9, 11
Task 13 (serial detail page)        — depends on Task 9
Task 14 (serial entry table)        — no deps
Task 15 (stock entry integration)   — depends on Task 9, 10, 14
Task 16 (permissions)               — no deps
Task 17 (build verify)              — depends on all
```

**Parallelizable groups:**
- Tasks 1, 2, 8, 10, 14, 16 can all run in parallel (no deps)
- Tasks 3, 5, 9, 11 can run after their single deps complete
- Tasks 4, 12, 13 follow next
- Tasks 6, 7, 15 follow after that
- Task 17 is always last
