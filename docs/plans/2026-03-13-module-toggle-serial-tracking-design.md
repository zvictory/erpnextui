# Module Toggle + Serial Number / IMEI Tracking

**Date:** 2026-03-13
**Status:** Approved

## Overview

Two features:
1. **Tenant-based module toggling** — admin panel controls which module groups each tenant sees
2. **Serial Number / IMEI tracking** — full CRUD for serial numbers with dual IMEI code support, targeting phone shop tenants

## Decisions

- Module config lives in admin panel (`data/config.json`), not in ERPNext backend
- Toggle granularity: group-level (Main, Master Data, Transactions, Stock, Serial Tracking, Accounting, Reports)
- Serial Tracking is its own independent toggle, separate from Stock
- One Serial No per device, IMEI codes stored as custom fields (`custom_imei_1`, `custom_imei_2`) on ERPNext's Serial No doctype
- V1 scope: receive stock with serial + IMEI entry, serial number list with IMEI search, edit IMEI codes

---

## Section 1: Module Toggle Data Model

Extend tenant config in `data/config.json`:

```typescript
interface TenantSite {
  name: string;
  url: string;
  apiKey: string;
  enabled?: boolean;
  enabledModuleGroups?: string[];  // NEW
}
```

Default: if `enabledModuleGroups` is undefined/empty, all groups enabled (backward compatible).

Module groups:

| Key | Label | Routes |
|-----|-------|--------|
| `main` | Main | Dashboard, Expenses, Fund Transfer |
| `master-data` | Master Data | Products, Customers, Vendors, Employees |
| `transactions` | Transactions | Quotations, Sales Orders, Delivery Notes, Sales Invoices, Purchase Orders, Purchase Invoices, Payments |
| `stock` | Stock | Warehouses, Stock Entries, Stock Ledger |
| `serial-tracking` | Serial Tracking | Serial Numbers |
| `accounting` | Accounting | Banks, Chart of Accounts |
| `reports` | Reports | All 8 report pages |

---

## Section 2: Admin Panel UI

Add "Enabled Modules" checkbox section to tenant edit page (`/admin/tenants/[id]`), below existing fields.

- Checkboxes with group name + brief description
- All checked by default for new tenants
- "Main" group always enabled (non-toggleable)
- Changes saved to `enabledModuleGroups` array in config.json
- Takes effect immediately (no restart)

---

## Section 3: Sidebar Filtering & Route Guard

New file `src/lib/module-groups.ts` — defines MODULE_GROUPS constant mapping group keys to labels, routes, and `alwaysEnabled` flag.

**Sidebar filtering:**
1. New hook `useEnabledModules()` fetches `/api/tenant-modules`, returns `Set<string>` of enabled group keys
2. Sidebar applies `isRouteEnabled(route, enabledGroups)` filter after existing permission filter
3. Entire sidebar groups disappear when disabled

**Route guard** in `src/app/(app)/layout.tsx`:
- After AuthGuard, check if current route's module group is enabled
- If disabled, redirect to `/dashboard`
- Uses same cached `useEnabledModules()` data

**Caching:** React Query, 5-minute stale time.

---

## Section 4: Serial Number Data Model

**ERPNext setup (per tenant):** Add custom fields to Serial No doctype:
- `custom_imei_1` (Data) — Primary IMEI
- `custom_imei_2` (Data) — Secondary IMEI

**TypeScript types** (`src/types/serial-number.ts`):

```typescript
interface SerialNumber {
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
}

interface SerialNumberListItem {
  name: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  status: string;
  custom_imei_1: string;
  custom_imei_2: string;
}
```

**IMEI search:** Two-query approach (search IMEI-1, search IMEI-2, deduplicate client-side). Upgrade to custom API if performance becomes an issue.

---

## Section 5: Serial Numbers UI

**List page** (`/serial-numbers`):
- DataTable with columns: Serial No, Item, IMEI 1, IMEI 2, Warehouse, Status
- Search queries serial_no, item_code, custom_imei_1, custom_imei_2
- Status badges: Active=green, Delivered=blue, Inactive=gray
- 20 per page, sortable columns

**Detail/edit page** (`/serial-numbers/[id]`):
- Read-only: Serial No, Item, Warehouse, Status (controlled by stock transactions)
- Editable: IMEI 1, IMEI 2
- Save button updates via `frappe.updateDoc`

---

## Section 6: Stock Entry Integration

When an item has `has_serial_no = 1`, line item row expands with serial number sub-table:

- Each row: Serial No, IMEI 1, IMEI 2
- Row count must match qty (validated before submit)
- IMEI fields optional (not all serialized items are phones)

**Two-step submit:**
1. Submit Stock Entry with `serial_no` field (newline-separated list) — ERPNext auto-creates Serial No docs
2. Update each Serial No doc with IMEI codes via `frappe.updateDoc`

**Error handling:** If IMEI update fails after stock entry succeeds, show warning toast. Don't roll back valid stock transaction over metadata failure.

---

## Section 7: Files

**New files:**

```
src/lib/module-groups.ts
src/types/serial-number.ts
src/hooks/use-serial-numbers.ts
src/hooks/use-enabled-modules.ts
src/app/api/tenant-modules/route.ts
src/app/(app)/serial-numbers/page.tsx
src/app/(app)/serial-numbers/[id]/page.tsx
src/components/serial-numbers/serial-columns.tsx
src/components/serial-numbers/imei-edit-form.tsx
src/components/serial-numbers/serial-entry-table.tsx
```

**Modified files:**

```
src/hooks/query-keys.ts                — Add serialNumbers keys
src/components/layout/app-sidebar.tsx  — Filter by enabled module groups
src/app/(app)/layout.tsx               — Route guard for disabled modules
src/components/admin/tenant-form.tsx   — Add module checkboxes
src/app/api/admin/tenants/route.ts     — Handle enabledModuleGroups in save
src/hooks/use-stock-entries.ts         — Pass serial_no on submit
src/types/stock-entry.ts              — Add serial_no to StockEntryDetail
src/hooks/use-items.ts                — Fetch has_serial_no field
src/types/item.ts                     — Add has_serial_no to Item type
```

**Query keys:**

```typescript
serialNumbers: {
  list: (company, page, search, sort) => ["serialNumbers", "list", ...],
  count: (company, search) => ["serialNumbers", "count", ...],
  detail: (name) => ["serialNumbers", "detail", name],
}
```

**Invalidation after stock entry submit:** stockEntries, bins, stockLedger, serialNumbers.
