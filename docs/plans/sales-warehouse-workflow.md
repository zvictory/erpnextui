# Sales → Warehouse → Customer Workflow

> Plan file for `docs/plans/sales-warehouse-workflow.md`
> Place this file in `docs/plans/` and reference it from CLAUDE.md

## Overview

Complete sales-to-delivery workflow for mobile phone retail (main warehouse + 2-3 shops).
The Next.js UI talks to ERPNext v15 via Frappe API. This plan covers BOTH sides:
1. **ERPNext backend** — workflows, validations, hooks
2. **Next.js frontend** — UI pages, components, API integration

## Project Context

- **Repo**: https://github.com/zvictory/erpnextui
- **Stack**: Next.js 16, TypeScript, Drizzle ORM, shadcn/ui, TanStack Query/Table, Zustand, next-intl (i18n), Tailwind CSS 4
- **Issue tracker**: `bd` (beads) — use `bd create` for new tasks
- **Testing**: Vitest + Testing Library
- **Conventions**: See CLAUDE.md and AGENTS.md — always `git push` at session end

## Business Flow

```
Sotuvchi (Shop)          Sklad boshlig'i           Skladchi              Mijoz
     │                        │                       │                    │
     ├─ Sales Invoice ────────>                       │                    │
     │  (stock check auto)    │                       │                    │
     │                        ├─ Approve/Reject       │                    │
     │                        │                       │                    │
     │                        ├─ Ready for Pickup ────>                    │
     │                        │                       ├─ Pick (IMEI scan)  │
     │                        │                       ├─ Pack             │
     │                        │                       ├─ Deliver ─────────>
     │                        │                       │                    ├─ Receive
     │                        ├─ Complete <────────────┤                    │
```

## Warehouse Structure

```
Main Warehouse (all stock received here)
├── Shop 1 - POS (retail)
├── Shop 2 - POS (retail)
├── Shop 3 - POS (retail)
├── Defective / Returns
└── Brak (yaroqsiz mahsulot)
```

---

## Part 1: ERPNext Backend Setup

### 1.1 Workflow Definition (Sales Invoice)

Create via Setup > Workflow or fixture JSON:

```
States:
  Draft                → style: ""           → allow_edit: Sales User
  Pending Approval     → style: "Warning"    → allow_edit: Sales User
  Approved             → style: "Success"    → allow_edit: Stock Manager
  Rejected             → style: "Danger"     → allow_edit: Stock Manager
  Ready for Pickup     → style: "Info"       → allow_edit: Stock Manager
  Picked               → style: "Info"       → allow_edit: Stock User
  Packed               → style: "Info"       → allow_edit: Stock User
  Delivered            → style: "Success"    → allow_edit: Stock User
  Completed            → style: "Success"    → allow_edit: Stock Manager

Transitions:
  Draft → Pending Approval         (Sales User, action: "Submit for Approval")
  Pending Approval → Approved      (Stock Manager, action: "Approve")
  Pending Approval → Rejected      (Stock Manager, action: "Reject")
  Rejected → Pending Approval      (Sales User, action: "Resubmit")
  Approved → Ready for Pickup      (Stock Manager, action: "Send to Warehouse")
  Ready for Pickup → Picked        (Stock User, action: "Mark as Picked")
  Picked → Packed                  (Stock User, action: "Mark as Packed")
  Packed → Delivered               (Stock User, action: "Mark as Delivered")
  Delivered → Completed            (Stock Manager, action: "Complete")
```

### 1.2 Stock Validation Hook

Server script or custom app — validate stock before SI submit:

```python
# hooks.py: doc_events > Sales Invoice > before_submit
import frappe
from erpnext.stock.utils import get_stock_balance

def validate_stock_on_submit(doc, method):
    errors = []
    for item in doc.items:
        if item.warehouse:
            avail = get_stock_balance(item.item_code, item.warehouse,
                                      doc.posting_date, doc.posting_time)
            if avail < item.qty:
                errors.append(f"{item.item_name}: kerak {item.qty}, bor {avail}")
    if errors:
        frappe.throw("<br>".join(errors), title="Zaxira yetarli emas")
```

### 1.3 Serial No / IMEI Setup

For phone items: `has_serial_no = 1`. Each IMEI is a Serial No.
On Pick List, warehouse staff selects specific IMEI numbers.
Serial No links to: customer, warranty date, sales invoice.

### 1.4 Delivery Note Flow

Stock is ONLY deducted when Delivery Note is submitted (not on SI submit).
DN is created from approved SI after packing is complete.

---

## Part 2: Next.js Frontend (erpnextui)

### 2.1 New Pages

Create under `src/app/`:

```
src/app/
├── sales/
│   ├── invoices/
│   │   ├── page.tsx              # SI list with workflow_state filters
│   │   ├── [id]/page.tsx         # SI detail with workflow actions
│   │   └── new/page.tsx          # Create new SI with stock check
│   └── pos/
│       └── page.tsx              # Quick POS for shop counter
├── warehouse/
│   ├── approvals/
│   │   └── page.tsx              # Pending approval queue
│   ├── picking/
│   │   └── page.tsx              # Pick list — items to collect
│   ├── packing/
│   │   └── page.tsx              # Pack verification
│   └── delivery/
│       └── page.tsx              # Delivery tracking / handoff
└── dashboard/
    └── page.tsx                  # Pipeline overview (counts per state)
```

### 2.2 New Components

Create under `src/components/`:

```
src/components/
├── sales/
│   ├── invoice-form.tsx          # SI creation form (items, customer, warehouse)
│   ├── stock-badge.tsx           # Real-time stock availability indicator
│   ├── workflow-actions.tsx      # Approve/Reject/Pick/Pack/Deliver buttons
│   └── workflow-timeline.tsx     # Visual status timeline
├── warehouse/
│   ├── approval-card.tsx         # Pending SI card with approve/reject
│   ├── pick-list-item.tsx        # Item row with IMEI scanner input
│   ├── pack-checklist.tsx        # Verify picked items before packing
│   └── delivery-confirmation.tsx # Customer handoff confirmation
├── shared/
│   ├── imei-scanner.tsx          # Barcode/IMEI input with validation
│   └── pipeline-chart.tsx        # Horizontal funnel showing SI states
```

### 2.3 API Layer

Create under `src/lib/api/`:

```typescript
// src/lib/api/sales-invoice.ts

import { useMutation, useQuery } from "@tanstack/react-query";

const ERPNEXT_URL = process.env.NEXT_PUBLIC_ERPNEXT_URL;

// Fetch invoices by workflow state
export function useInvoicesByState(state: string) {
  return useQuery({
    queryKey: ["sales-invoices", state],
    queryFn: () =>
      fetch(`${ERPNEXT_URL}/api/resource/Sales Invoice?filters=[["workflow_state","=","${state}"]]&fields=["name","customer","grand_total","workflow_state","creation"]&order_by=creation desc`)
        .then(r => r.json()),
  });
}

// Check stock for items before submit
export function useStockCheck() {
  return useMutation({
    mutationFn: (items: { item_code: string; warehouse: string; qty: number }[]) =>
      fetch(`${ERPNEXT_URL}/api/method/erpnext.stock.utils.get_stock_balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).then(r => r.json()),
  });
}

// Transition workflow state
export function useWorkflowTransition() {
  return useMutation({
    mutationFn: ({ docname, action }: { docname: string; action: string }) =>
      fetch(`${ERPNEXT_URL}/api/method/frappe.model.workflow.apply_workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc: JSON.stringify({ doctype: "Sales Invoice", name: docname }),
          action,
        }),
      }).then(r => r.json()),
  });
}

// Create Delivery Note from SI
export function useCreateDeliveryNote() {
  return useMutation({
    mutationFn: (siName: string) =>
      fetch(`${ERPNEXT_URL}/api/method/erpnext.selling.doctype.sales_invoice.sales_invoice.make_delivery_note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_name: siName }),
      }).then(r => r.json()),
  });
}
```

### 2.4 Zustand Store

```typescript
// src/stores/warehouse-store.ts

import { create } from "zustand";

interface WarehouseState {
  selectedWarehouse: string;
  pendingApprovals: number;
  pickQueue: number;
  packQueue: number;
  deliveryQueue: number;
  setWarehouse: (wh: string) => void;
  refreshCounts: () => Promise<void>;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
  selectedWarehouse: "Main Warehouse",
  pendingApprovals: 0,
  pickQueue: 0,
  packQueue: 0,
  deliveryQueue: 0,
  setWarehouse: (wh) => set({ selectedWarehouse: wh }),
  refreshCounts: async () => {
    // Fetch counts from ERPNext API per workflow_state
    // set({ pendingApprovals: ..., pickQueue: ..., etc })
  },
}));
```

### 2.5 i18n Keys (next-intl)

Add to `messages/uz.json` and `messages/ru.json`:

```json
{
  "sales": {
    "newInvoice": "Yangi hisob-faktura",
    "pendingApproval": "Tasdiqlash kutilmoqda",
    "approved": "Tasdiqlangan",
    "rejected": "Rad etilgan",
    "stockInsufficient": "Zaxira yetarli emas",
    "submitForApproval": "Tasdiqlashga yuborish"
  },
  "warehouse": {
    "pick": "Yig'ish",
    "pack": "Qadoqlash",
    "deliver": "Yetkazish",
    "scanImei": "IMEI skanerlang",
    "confirmDelivery": "Topshirishni tasdiqlash"
  }
}
```

---

## Part 3: Beads Task Breakdown

Run these in order to create the issue tree:

```bash
# Epic
bd create "Sales → Warehouse → Customer workflow" -p 3

# ERPNext backend
bd create "Define SI workflow states and transitions in ERPNext" --parent <epic-id>
bd create "Add stock validation hook (before_submit)" --parent <epic-id>
bd create "Configure Serial No / IMEI for phone items" --parent <epic-id>
bd create "Set up notification rules for workflow transitions" --parent <epic-id>

# Next.js frontend - API layer
bd create "Create sales-invoice API hooks (TanStack Query)" --parent <epic-id>
bd create "Create workflow transition mutation hook" --parent <epic-id>
bd create "Create stock-check API endpoint/hook" --parent <epic-id>

# Next.js frontend - Pages
bd create "Build sales invoice list page with state filters" --parent <epic-id>
bd create "Build sales invoice detail page with workflow actions" --parent <epic-id>
bd create "Build warehouse approval queue page" --parent <epic-id>
bd create "Build pick list page with IMEI scanner" --parent <epic-id>
bd create "Build pack verification page" --parent <epic-id>
bd create "Build delivery confirmation page" --parent <epic-id>
bd create "Build pipeline dashboard (counts per state)" --parent <epic-id>

# Components
bd create "Create workflow-timeline component" --parent <epic-id>
bd create "Create imei-scanner component" --parent <epic-id>
bd create "Create stock-badge real-time indicator" --parent <epic-id>
bd create "Create workflow-actions button group" --parent <epic-id>

# i18n
bd create "Add Uzbek/Russian translations for sales/warehouse" --parent <epic-id>

# Testing
bd create "Write tests for stock validation logic" --parent <epic-id>
bd create "Write tests for workflow state transitions" --parent <epic-id>
bd create "E2E test: full invoice → delivery cycle" --parent <epic-id>
```

---

## Part 4: Testing Checklist

```
ERPNext Backend:
- [ ] SI with sufficient stock → submits, state = Pending Approval
- [ ] SI with insufficient stock → blocked with Uzbek error message
- [ ] Stock Manager approves → state = Approved
- [ ] Stock Manager rejects → state = Rejected, reason shown
- [ ] Rejected SI → salesperson can resubmit
- [ ] Pick List created from approved SI with IMEI selection
- [ ] Delivery Note deducts stock correctly
- [ ] Payment Entry links to SI (cash + installment)
- [ ] Notifications fire at each transition

Next.js Frontend:
- [ ] Invoice list filters by workflow_state
- [ ] Real-time stock badge shows availability
- [ ] Workflow action buttons appear per role/state
- [ ] IMEI scanner validates format and uniqueness
- [ ] Timeline shows full workflow history
- [ ] Dashboard shows correct counts per state
- [ ] All text appears in Uzbek/Russian per locale
- [ ] Mobile responsive (warehouse staff use phones)
```

---

## Roles & Permissions Matrix

| Role          | SI Create | SI Submit | Approve | Pick | Pack | Deliver | Payment |
|---------------|-----------|-----------|---------|------|------|---------|---------|
| Sales User    | ✓         | ✓         |         |      |      |         | ✓       |
| Stock Manager |           |           | ✓       |      |      |         |         |
| Stock User    |           |           |         | ✓    | ✓    | ✓       |         |
| Accounts User |           |           |         |      |      |         | ✓       |

---

## Session Completion Reminder

Per AGENTS.md — when ending work on this feature:
1. Create `bd` issues for remaining tasks
2. Run `npm run lint && npm run test && npm run build`
3. Update issue statuses
4. `git pull --rebase && bd sync && git push`
5. Verify `git status` shows "up to date with origin"
