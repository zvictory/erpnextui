# Costing + Asset & Maintenance Module — UI-only

> `docs/plans/costing-and-maintenance-module.md`
> Maqsad: Tannarx hisoblash + Asset/mashina boshqaruvi + Mexanik tabel + Profilaktika
> Yondashuv: Hammasi UI tomonida (Drizzle local DB), ERPNext faqat standart o'qish/yozish
> Loyiha: https://github.com/zvictory/erpnextui

---

## 1. Modulning to'liq qamrovi

```
COSTING MODULE
├── Employee cost setup (oylik/soatlik)
├── Work Order tabel (operatorlar timesheet)
├── Workstation power (elektr taqsimlash)
└── Costing dashboard (kumulativ + variance)

ASSET & MAINTENANCE MODULE  ← YANGI
├── Asset registry (mashinalar ro'yxati)
├── Asset detail (paspot, moliyaviy, OEE)
├── Mechanic timesheet (downtime + tamir)
├── Spare parts inventory (ehtiyot qismlar)
├── Preventive maintenance schedule (profilaktika)
├── Maintenance dashboard (barcha mashinalar)
└── OEE tracking (Availability × Performance × Quality)
```

---

## 2. Local Drizzle DB sxemasi (to'liq)

```typescript
// src/db/schema/costing.ts (avvalgi qism)

// Employee cost
export const employeeCostSettings = pgTable("employee_cost_settings", { ... });
export const employeeCostHistory = pgTable("employee_cost_history", { ... });

// Work Order tabel
export const workOrderTabel = pgTable("work_order_tabel", { ... });
export const timesheetEntries = pgTable("timesheet_entries", { ... });

// Workstation
export const workstationPower = pgTable("workstation_power", { ... });

// Allocation va snapshots
export const costAllocationSettings = pgTable("cost_allocation_settings", { ... });
export const costingSnapshots = pgTable("costing_snapshots", { ... });
```

```typescript
// src/db/schema/asset.ts (YANGI)

import {
  pgTable, serial, text, integer, numeric, timestamp,
  date, time, boolean, jsonb
} from "drizzle-orm/pg-core";

// 1. Asset registratsiyasi
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  asset_code: text("asset_code").notNull().unique(),    // AST-001
  name: text("name").notNull(),                          // Smes Qozon Alfa-200
  model: text("model"),                                  // Alfa-200
  serial_number: text("serial_number"),                  // SN-2022-A200-7842
  category: text("category"),                            // Mixer, Freezer, Pump...
  
  // Sotib olingan
  purchase_date: date("purchase_date").notNull(),
  supplier: text("supplier"),                            // Tetra Pak Asia LLC
  purchase_cost: numeric("purchase_cost", { precision: 15, scale: 2 }).notNull(),
  
  // Joylashuv
  location: text("location"),                            // Smes sex, joy 1
  workstation: text("workstation"),                      // ERPNext Workstation
  
  // Texnik xarakteristikalar
  power_kw: numeric("power_kw", { precision: 6, scale: 2 }),
  capacity: text("capacity"),                            // 200 L
  technical_specs: jsonb("technical_specs"),             // free-form JSON
  
  // Amortizatsiya
  useful_life_years: integer("useful_life_years").notNull(),  // 10
  salvage_value: numeric("salvage_value", { precision: 15, scale: 2 }).default("0"),
  depreciation_method: text("depreciation_method", {
    enum: ["straight_line", "declining_balance"]
  }).default("straight_line"),
  
  // Garantiya
  warranty_until: date("warranty_until"),
  
  // Holat
  status: text("status", {
    enum: ["operational", "maintenance", "broken", "retired"]
  }).default("operational"),
  
  // Boshqa
  qr_code: text("qr_code"),                              // QR / NFC tag
  notes: text("notes"),
  photo_url: text("photo_url"),
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// 2. Mexaniklar (alohida ishchi turi)
export const mechanics = pgTable("mechanics", {
  id: serial("id").primaryKey(),
  employee_id: text("employee_id").notNull().unique(),   // ERPNext Employee
  employee_name: text("employee_name").notNull(),
  hourly_rate: numeric("hourly_rate", { precision: 15, scale: 2 }).notNull(),
  specialization: text("specialization"),                // Electrical, Mechanical, Refrigeration
  certifications: jsonb("certifications"),               // ["EHS", "HVAC"]
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// 3. Maintenance log (mexanik tabel)
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: serial("id").primaryKey(),
  asset_id: integer("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  
  // Vaqt
  date: date("date").notNull(),
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  duration_hours: numeric("duration_hours", { precision: 5, scale: 2 }).notNull(),
  
  // Mexanik
  mechanic_id: text("mechanic_id").notNull(),            // Employee.name
  mechanic_name: text("mechanic_name").notNull(),
  mechanic_hourly_rate: numeric("mechanic_hourly_rate", { precision: 15, scale: 2 }),
  mechanic_cost: numeric("mechanic_cost", { precision: 15, scale: 2 }),
  
  // Tamir turi
  maintenance_type: text("maintenance_type", {
    enum: ["corrective", "preventive", "calibration", "cleaning", "capital"]
  }).notNull(),
  
  // Sabab va tavsif
  reason: text("reason").notNull(),                      // "Temperatura sensor ishlamayotgan"
  work_done: text("work_done"),                          // "Termopara almashtirildi, kalibrlash"
  
  // Holat
  resolution_status: text("resolution_status", {
    enum: ["resolved", "partially_resolved", "unresolved", "needs_replacement"]
  }).notNull(),
  
  // Xarajat
  parts_cost: numeric("parts_cost", { precision: 15, scale: 2 }).default("0"),
  total_cost: numeric("total_cost", { precision: 15, scale: 2 }).notNull(),
  
  // Tasdiq
  approved_by: text("approved_by"),                      // Employee.name
  approved_at: timestamp("approved_at"),
  
  // Cost classification
  cost_classification: text("cost_classification", {
    enum: ["operating_expense", "capitalized"]           // OpEx vs CapEx
  }).default("operating_expense"),
  
  notes: text("notes"),
  attachments: jsonb("attachments"),                     // photos, receipts
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// 4. Almashtirilgan qismlar (maintenance log uchun child)
export const maintenancePartsUsed = pgTable("maintenance_parts_used", {
  id: serial("id").primaryKey(),
  maintenance_log_id: integer("maintenance_log_id").references(() => maintenanceLogs.id, { onDelete: "cascade" }),
  
  part_name: text("part_name").notNull(),                // "Termopara K-tipi"
  part_code: text("part_code"),                          // SP-001
  qty: numeric("qty", { precision: 10, scale: 2 }).notNull(),
  unit_price: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  total_price: numeric("total_price", { precision: 15, scale: 2 }).notNull(),
  
  // Stock entry link (agar ERPNext'dan olingan bo'lsa)
  source_warehouse: text("source_warehouse"),
  stock_entry_name: text("stock_entry_name"),
});

// 5. Spare parts katalogi (ehtiyot qismlar)
export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  part_code: text("part_code").notNull().unique(),       // SP-001
  name: text("name").notNull(),                          // Termopara K-tipi
  category: text("category"),                            // Sensor, Bearing, Belt
  
  // Compatible assets
  compatible_assets: jsonb("compatible_assets"),         // ["AST-001", "AST-002"]
  
  // Stock
  current_stock: numeric("current_stock", { precision: 10, scale: 2 }).default("0"),
  min_stock: numeric("min_stock", { precision: 10, scale: 2 }).default("0"),
  reorder_qty: numeric("reorder_qty", { precision: 10, scale: 2 }),
  
  // Price
  last_purchase_price: numeric("last_purchase_price", { precision: 15, scale: 2 }),
  preferred_supplier: text("preferred_supplier"),
  
  // Storage
  storage_location: text("storage_location"),            // "Maintenance store, shelf A3"
  
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// 6. Profilaktika rejasi (preventive maintenance schedule)
export const preventiveMaintenanceSchedule = pgTable("preventive_maintenance_schedule", {
  id: serial("id").primaryKey(),
  asset_id: integer("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  
  task_name: text("task_name").notNull(),                // "Asosiy tozalash (CIP)"
  task_description: text("task_description"),
  
  // Davriylik
  frequency_type: text("frequency_type", {
    enum: ["days", "weeks", "months", "years", "operating_hours", "production_qty"]
  }).notNull(),
  frequency_value: integer("frequency_value").notNull(), // 7 (har 7 kun)
  
  // Tasvir vaqt
  estimated_duration_hours: numeric("estimated_duration_hours", { precision: 5, scale: 2 }),
  required_parts: jsonb("required_parts"),               // ["SP-005", "SP-012"]
  
  // Oxirgi va keyingi
  last_performed: date("last_performed"),
  next_due: date("next_due").notNull(),
  
  // Mas'ul
  assigned_mechanic: text("assigned_mechanic"),
  
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// 7. OEE measurements (kunlik o'lchovlar)
export const oeeMeasurements = pgTable("oee_measurements", {
  id: serial("id").primaryKey(),
  asset_id: integer("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  
  date: date("date").notNull(),
  
  // Availability = (Planned - Downtime) / Planned
  planned_production_time_hours: numeric("planned_production_time_hours", { precision: 6, scale: 2 }),
  downtime_hours: numeric("downtime_hours", { precision: 6, scale: 2 }).default("0"),
  
  // Performance = Actual / (Capacity × Run time)
  actual_qty: numeric("actual_qty", { precision: 12, scale: 2 }),
  capacity_per_hour: numeric("capacity_per_hour", { precision: 12, scale: 2 }),
  
  // Quality = Good / Total
  good_qty: numeric("good_qty", { precision: 12, scale: 2 }),
  total_qty: numeric("total_qty", { precision: 12, scale: 2 }),
  
  // Calculated
  availability_pct: numeric("availability_pct", { precision: 5, scale: 2 }),
  performance_pct: numeric("performance_pct", { precision: 5, scale: 2 }),
  quality_pct: numeric("quality_pct", { precision: 5, scale: 2 }),
  oee_pct: numeric("oee_pct", { precision: 5, scale: 2 }),
  
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

// 8. Downtime → Work Order impact (qaysi WO ga ta'sir qildi)
export const downtimeWorkOrderImpact = pgTable("downtime_work_order_impact", {
  id: serial("id").primaryKey(),
  maintenance_log_id: integer("maintenance_log_id").references(() => maintenanceLogs.id),
  work_order: text("work_order").notNull(),              // ERPNext Work Order.name
  delayed_by_hours: numeric("delayed_by_hours", { precision: 5, scale: 2 }),
  qty_impact: numeric("qty_impact", { precision: 12, scale: 2 }),
});
```

---

## 3. Sahifalar va funksiyalar

### 3.1 Asset List — `/assets`

```
┌────────────────────────────────────────────────────────────────┐
│ Mashinalar                  [Filter ▼]      [+ Yangi mashina]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌────┬────────────────┬──────┬────────────┬──────┬─────────┐  │
│ │Kod │Nomi            │Kupil │Amortizatsiya│Status│OEE      │  │
│ ├────┼────────────────┼──────┼────────────┼──────┼─────────┤  │
│ │001 │Smes Qozon Alfa │06/22 │1 250 000/oy│Ish.  │87%      │  │
│ │002 │Pasterizator    │03/23 │  666 667/oy│Tamir │72%      │  │
│ │003 │Cont. Freezer   │01/24 │1 666 667/oy│Ish.  │94%      │  │
│ │004 │Hardening Tunnel│09/23 │1 208 333/oy│Sing. │45%      │  │
│ │005 │Qadoqlash       │04/24 │1 250 000/oy│Ish.  │91%      │  │
│ └────┴────────────────┴──────┴────────────┴──────┴─────────┘  │
│                                                                │
│ Filter: Status, Joylashuv, Sex, Turi                           │
│ Sortlash: Sana, Qiymat, OEE                                    │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Asset Detail — `/assets/[id]`

3 ta tab:
- **Overview** — paspot ma'lumotlari, OEE metrikalari, balansdagi qoldiq qiymat
- **Maintenance History** — tamir yozuvlari ro'yxati
- **Preventive Schedule** — profilaktika jadvali

### 3.3 Asset yaratish/tahrirlash dialog

```
┌──────────────────────────────────────────────────┐
│ Yangi mashina qo'shish                     [X]   │
├──────────────────────────────────────────────────┤
│                                                  │
│ Asset kodi (auto): AST-006                       │
│ Nomi: [_________________]                        │
│ Modeli: [_____] Seriya: [_____]                  │
│ Kategoriya: [Mixer ▼]                            │
│                                                  │
│ — Sotib olish —                                  │
│ Sana: [____] Qiymat: [____]                      │
│ Yetkazib bergan: [____]                          │
│                                                  │
│ — Joylashuv —                                    │
│ Joy: [____] Workstation: [Smes Qozon ▼]          │
│                                                  │
│ — Texnik —                                       │
│ Quvvat: [__] kW Sig'imi: [__]                    │
│ + Texnik xarakteristika qo'shish                 │
│                                                  │
│ — Amortizatsiya —                                │
│ Foydali muddat: [10] yil                         │
│ Qoldiq qiymat: [5 000 000]                       │
│ Usul: [Straight Line ▼]                          │
│                                                  │
│ Garantiya: [____]                                │
│                                                  │
│ [Saqlash] [Bekor]                                │
└──────────────────────────────────────────────────┘
```

### 3.4 Mexanik timesheet — `/maintenance/logs`

Barcha tamir yozuvlari ro'yxati. Filter: mashina, mexanik, sana, turi.

### 3.5 Yangi tamir yozuvi dialog

```
Mashina + sana + boshlash/tugash vaqti
Mexanik (Employee dan) + soatlik stavka avtomatik
Tamir turi: Avariya/Profilaktika/Kalibrovka/Tozalash/Kapital
Sabab + bajarilgan ishlar
Holat: Hal qilindi/Qisman/Hal qilinmadi/Almashtirish kerak
Almashtirilgan qismlar (spare parts dan tanlash)
Jami xarajat avtomatik
Tasdiqlovchi
```

### 3.6 Spare Parts — `/maintenance/spare-parts`

Ehtiyot qismlar katalogi:
- Joriy zaxira
- Min zaxira (bundan past — alert)
- Mos mashinalar
- Oxirgi sotib olish narxi
- Avtomatik Material Request (zaxira tugayotganda)

### 3.7 Preventive Maintenance — `/maintenance/schedule`

Taqvim ko'rinishi:
- Bugun, ertaga, bu hafta, kechikkan
- Har bir vazifa uchun: mashina, mexanik, kerakli qismlar
- Bajarilgani qayd qilish — yangi maintenance log yaratiladi

### 3.8 Maintenance Dashboard — `/maintenance/dashboard`

```
4 KPI: O'rtacha OEE | Bu oy downtime | Tamir soni | Tamir xarajati

OEE per asset (jadval bilan barlar)

Downtime trend (chart)

Top issues (eng ko'p uchragan muammolar)

Mechanic performance (har bir mexanik samaradorligi)
```

---

## 4. ERPNext bilan integratsiya

### Faqat 2 yo'nalish:

**O'qish:**
- Employee (mexanik ma'lumotlari uchun)
- Workstation (asset bog'lanishi uchun)
- Item (spare parts kataloglariga ulash)
- Stock Balance (spare parts zaxirasi)

**Yozish:**
- Material Request (spare parts buyurtma) — standart ERPNext
- Stock Entry (Material Issue) — spare parts ishlatilganda

Asset ma'lumotlari ERPNext'ga umuman yozilmaydi — hammasi local DB'da.

---

## 5. Fayl tuzilmasi (yangi qismlar)

```
src/
├── db/schema/
│   ├── costing.ts                              # avvalgi
│   └── asset.ts                                # YANGI (8 jadval)
│
├── app/
│   ├── (app)/
│   │   ├── assets/
│   │   │   ├── page.tsx                        # YANGI: list
│   │   │   ├── [id]/page.tsx                   # YANGI: detail (3 tabs)
│   │   │   └── new/page.tsx                    # YANGI: yaratish
│   │   └── maintenance/
│   │       ├── dashboard/page.tsx              # YANGI: OEE dashboard
│   │       ├── logs/page.tsx                   # YANGI: tamir tarixi
│   │       ├── schedule/page.tsx               # YANGI: profilaktika
│   │       └── spare-parts/page.tsx            # YANGI: ehtiyot qismlar
│   │
│   └── api/
│       ├── assets/                             # CRUD
│       ├── maintenance/
│       │   ├── logs/                           # CRUD
│       │   ├── schedule/                       # GET, POST, complete
│       │   ├── spare-parts/                    # CRUD + low stock alert
│       │   └── oee/                            # POST measurement, GET stats
│       └── mechanics/                          # mexaniklar ro'yxati
│
├── components/
│   ├── assets/
│   │   ├── AssetList.tsx
│   │   ├── AssetDetail.tsx
│   │   ├── AssetForm.tsx
│   │   ├── AssetStatusBadge.tsx
│   │   ├── DepreciationCard.tsx
│   │   ├── BookValueCalculator.tsx
│   │   └── AssetTechnicalSpecs.tsx
│   │
│   └── maintenance/
│       ├── MaintenanceLogTable.tsx
│       ├── MaintenanceLogDialog.tsx            # Yangi tamir yozish
│       ├── MechanicSelector.tsx
│       ├── PartsUsedTable.tsx                  # Almashtirilgan qismlar
│       ├── SparePartsList.tsx
│       ├── SparePartLowStockAlert.tsx
│       ├── PreventiveScheduleCalendar.tsx
│       ├── PreventiveTaskCard.tsx
│       ├── OEECard.tsx
│       ├── OEETrendChart.tsx
│       ├── DowntimeImpactWidget.tsx           # Downtime → WO ta'siri
│       └── MechanicPerformanceTable.tsx
│
├── lib/
│   ├── api/
│   │   ├── asset.ts                            # TanStack hooks
│   │   └── maintenance.ts
│   │
│   └── utils/
│       ├── depreciation.ts                     # Straight line, declining balance
│       ├── oee.ts                              # OEE hisoblash
│       └── mtbf-mttr.ts                        # MTBF/MTTR metrikalar
│
└── types/
    ├── asset.ts                                # YANGI
    └── maintenance.ts                          # YANGI
```

---

## 6. Asosiy hisob-kitob algoritmlari

### OEE (Overall Equipment Effectiveness)

```typescript
// src/lib/utils/oee.ts

export function calculateOEE(measurement: OEEMeasurement) {
  const availability = (
    (measurement.planned_production_time_hours - measurement.downtime_hours) /
    measurement.planned_production_time_hours
  ) * 100;
  
  const performance = (
    measurement.actual_qty /
    (measurement.capacity_per_hour * 
      (measurement.planned_production_time_hours - measurement.downtime_hours))
  ) * 100;
  
  const quality = (measurement.good_qty / measurement.total_qty) * 100;
  
  const oee = (availability * performance * quality) / 10000;
  
  return { availability, performance, quality, oee };
}

// World class OEE = 85%+
// Good = 70-85%
// Average = 50-70%
// Low = <50% (kritik!)
```

### Amortizatsiya (Straight Line)

```typescript
// src/lib/utils/depreciation.ts

export function calculateMonthlyDepreciation(asset: Asset): number {
  const totalMonths = asset.useful_life_years * 12;
  const depreciableValue = asset.purchase_cost - (asset.salvage_value || 0);
  return depreciableValue / totalMonths;
}

export function calculateBookValue(asset: Asset, asOfDate: Date): number {
  const purchaseDate = new Date(asset.purchase_date);
  const monthsUsed = differenceInMonths(asOfDate, purchaseDate);
  const monthlyDepr = calculateMonthlyDepreciation(asset);
  const accumDepr = monthlyDepr * monthsUsed;
  return Math.max(asset.purchase_cost - accumDepr, asset.salvage_value || 0);
}
```

### MTBF (Mean Time Between Failures)

```typescript
// src/lib/utils/mtbf-mttr.ts

export function calculateMTBF(maintenanceLogs: MaintenanceLog[]): number {
  const correctiveLogs = maintenanceLogs.filter(l => l.maintenance_type === "corrective");
  if (correctiveLogs.length < 2) return 0;
  
  // Sort by date
  correctiveLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate intervals between failures
  const intervals: number[] = [];
  for (let i = 1; i < correctiveLogs.length; i++) {
    const days = differenceInDays(
      new Date(correctiveLogs[i].date),
      new Date(correctiveLogs[i-1].date)
    );
    intervals.push(days * 24);  // hours
  }
  
  return intervals.reduce((s, n) => s + n, 0) / intervals.length;
}

export function calculateMTTR(maintenanceLogs: MaintenanceLog[]): number {
  const correctiveLogs = maintenanceLogs.filter(l => l.maintenance_type === "corrective");
  if (correctiveLogs.length === 0) return 0;
  
  const totalRepairTime = correctiveLogs.reduce((s, l) => s + l.duration_hours, 0);
  return totalRepairTime / correctiveLogs.length;
}
```

### Downtime → Work Order ta'siri

```typescript
// Asset downtime bo'lganda, qaysi Work Order ta'sirlanadi?

async function findImpactedWorkOrders(assetId: number, downtimeDate: Date, durationHours: number) {
  const asset = await getAsset(assetId);
  
  // Workstation orqali active WO larni topish
  const activeWOs = await fetch(
    `${ERP}/api/resource/Work Order?filters=[
      ["status","in",["Not Started","In Process"]],
      ["planned_start_date","<=","${downtimeDate.toISOString()}"]
    ]&fields=["name","production_item","qty","produced_qty","planned_end_date"]`
  ).then(r => r.json());
  
  // Workstation'dagi operatsiyalar via BOM
  const impactedWOs = activeWOs.data.filter(wo => 
    wo.workstation_used === asset.workstation
  );
  
  return impactedWOs.map(wo => ({
    work_order: wo.name,
    delay_hours: durationHours,
    qty_at_risk: wo.qty - wo.produced_qty,
  }));
}
```

---

## 7. Mexanik xarajatining tannarxga ta'siri

```typescript
// IAS 16 / IAS 2 qoidalari:

// 1. Routine maintenance (CIP, tozalash) → Manufacturing Overhead
//    - Workstation Hour Rate ga ta'sir qiladi
//    - Tannarxga absorbed
function classifyMaintenance(log: MaintenanceLog) {
  if (log.maintenance_type === "cleaning" || 
      log.maintenance_type === "preventive") {
    return "manufacturing_overhead";  // Tannarxga
  }
  
  // 2. Avariya tamiri → Period cost (P&L)
  if (log.maintenance_type === "corrective") {
    return "operating_expense";  // P&L da xarajat
  }
  
  // 3. Kapital tamir → Asset qiymatiga qo'shiladi
  if (log.maintenance_type === "capital") {
    return "capitalized";  // Asset value ga qo'shiladi, amortizatsiya orqali
  }
}
```

---

## 8. Spare Parts integratsiyasi

```
1. Spare part katalog yaratish:
   - part_code (SP-001), nomi, kategoriya
   - Mos mashinalar (compatible_assets)
   - Min stock (zaxira tugayotganda alert)

2. Maintenance log da qism ishlatish:
   - "Almashtirilgan qismlar" jadvalga qo'shish
   - Avtomatik current_stock kamayadi
   - Agar < min_stock → ogohlantirish

3. Avtomatik Material Request:
   - Stock < min → "Buyurtma qilish" tugmasi
   - Click → ERPNext Material Request yaratiladi

4. Yangi qism keldi:
   - ERPNext Stock Entry (Material Receipt)
   - Local current_stock yangilanadi
```

---

## 9. Beads tasks

```bash
bd create "Costing + Asset & Maintenance Module (UI-only)" -p 4

# Database
bd create "Drizzle schema: asset.ts (8 jadval)" --parent <root>

# Asset
bd create "Asset list sahifa" --parent <root>
bd create "Asset detail (3 tab)" --parent <root>
bd create "Asset yaratish/tahrirlash dialog" --parent <root>
bd create "Depreciation va book value komponentlari" --parent <root>
bd create "QR kod generatsiya va skanlash" --parent <root>

# Maintenance Logs
bd create "Maintenance logs list" --parent <root>
bd create "MaintenanceLogDialog (yangi tamir)" --parent <root>
bd create "PartsUsedTable komponenti" --parent <root>
bd create "Mechanic performance dashboard" --parent <root>

# Spare Parts
bd create "Spare parts katalogi" --parent <root>
bd create "Low stock alert + Material Request" --parent <root>

# Preventive Maintenance
bd create "Preventive schedule kalendar" --parent <root>
bd create "Profilaktika eslatma tizimi" --parent <root>
bd create "Bajarish → maintenance log avtomatik" --parent <root>

# OEE
bd create "OEE measurement form" --parent <root>
bd create "OEE dashboard + trend chart" --parent <root>
bd create "MTBF/MTTR metrikalar" --parent <root>

# Integration
bd create "Downtime → Work Order impact widget" --parent <root>
bd create "Mexanik xarajati → costing dashboard" --parent <root>

# API
bd create "API: assets CRUD" --parent <root>
bd create "API: maintenance logs CRUD" --parent <root>
bd create "API: spare parts + low stock" --parent <root>
bd create "API: preventive schedule" --parent <root>
bd create "API: OEE measurements" --parent <root>

# Sidebar va i18n
bd create "Sidebar: Assets, Maintenance" --parent <root>
bd create "uz/ru tarjimalar (asset, maintenance)" --parent <root>
```

---

## 10. To'liq Claude Code prompt

```
Read docs/plans/costing-and-maintenance-module.md and implement the full
Costing + Asset & Maintenance module.

CRITICAL: This is UI-ONLY. All data lives in our local Drizzle DB.
Do NOT create any custom fields or custom DocTypes in ERPNext.
Only standard ERPNext APIs are used (Employee, Workstation, Material 
Request, Stock Entry).

This module has TWO parts:

PART 1 — Costing (from earlier plan):
- Employee cost settings (monthly salary, hourly rate)
- Work Order tabel (operator timesheet)
- Workstation power
- Costing dashboard (cumulative + variance)

PART 2 — Asset & Maintenance (NEW):
- Asset registry (machines)
- Mechanic timesheet (downtime + repair logs)
- Spare parts inventory
- Preventive maintenance schedule
- OEE tracking
- Maintenance dashboard

## Implementation order

### STEP 1 — Database schema
Create:
- src/db/schema/costing.ts (7 tables from earlier)
- src/db/schema/asset.ts (8 tables: assets, mechanics, maintenance_logs,
  maintenance_parts_used, spare_parts, preventive_maintenance_schedule,
  oee_measurements, downtime_work_order_impact)

Run: npm run db:generate && npm run db:migrate

### STEP 2 — Types
Create src/types/asset.ts and src/types/maintenance.ts with all interfaces.
Use the schema definitions as source of truth.

### STEP 3 — Utility functions
Create src/lib/utils/:
- depreciation.ts (straight line, declining balance, book value)
- oee.ts (Availability × Performance × Quality)
- mtbf-mttr.ts (MTBF, MTTR calculations)

### STEP 4 — API routes (Next.js)
Create src/app/api/:
- assets/ (GET list, POST create, GET/PUT/DELETE [id])
- maintenance/logs/ (CRUD + filter by asset/mechanic/date)
- maintenance/schedule/ (GET upcoming, POST create, POST [id]/complete)
- maintenance/spare-parts/ (CRUD + low_stock_alert endpoint)
- maintenance/oee/ (POST measurement, GET stats by asset/period)
- mechanics/ (GET list from Employee filtered by department/role)

For Material Request from spare part low stock:
POST /api/method/erpnext.stock.doctype.material_request.material_request.make_purchase_order

### STEP 5 — Asset module
Pages: /assets (list), /assets/[id] (detail), /assets/new (create)
Components: AssetList, AssetDetail, AssetForm, DepreciationCard,
BookValueCalculator, AssetStatusBadge

Asset detail has 3 tabs:
- Overview: passport info + financial + technical specs
- Maintenance History: list of maintenance logs for this asset
- Preventive Schedule: upcoming preventive tasks

### STEP 6 — Maintenance module
Pages:
- /maintenance/dashboard (OEE overview, KPIs, trends)
- /maintenance/logs (all maintenance logs with filters)
- /maintenance/schedule (preventive calendar)
- /maintenance/spare-parts (spare parts inventory)

Key components:
- MaintenanceLogDialog: create new repair log with parts used
- MechanicSelector: choose mechanic, auto-fill hourly rate
- PartsUsedTable: add spare parts to repair (auto-decrement stock)
- PreventiveScheduleCalendar: visual calendar with overdue highlighting
- OEECard: show Availability × Performance × Quality breakdown
- DowntimeImpactWidget: when machine breaks, show affected Work Orders

### STEP 7 — Costing integration
Extend Costing Dashboard to include maintenance costs:
- Add "Maintenance" as 5th metric card alongside Raw, Labor, Energy, Depreciation
- Maintenance cost from local maintenance_logs.total_cost
- Show breakdown: routine (in COGS) vs corrective (period cost)

### STEP 8 — Stock Entry integration
When mechanic uses spare parts in a maintenance log:
- POST to /api/resource/Stock Entry (Material Issue)
- Source: Maintenance Store warehouse
- Cost goes to Maintenance Expense account (or capitalized for big repairs)

### STEP 9 — Sidebar
Add new sidebar groups:
- "Assets" → /assets
- "Maintenance":
  - Dashboard → /maintenance/dashboard
  - Logs → /maintenance/logs
  - Schedule → /maintenance/schedule
  - Spare Parts → /maintenance/spare-parts

### STEP 10 — i18n
Add translation keys for assets, maintenance, OEE, downtime to 
messages/uz.json and messages/ru.json.

## Testing scenarios

1. Add new asset (Smes Qozon Alfa-200, 150M UZS, 10 yil)
   → Check depreciation calculated: 1,208,333/month
   → Check book value updates daily

2. Create maintenance log
   - Asset: AST-002
   - Date/time, mechanic
   - Parts used: Termopara K-tipi (250,000)
   - Save → spare parts stock decrements
   → Check appears in asset's maintenance history
   → Check appears in /maintenance/logs

3. Spare part low stock
   - Termopara stock: 1, min: 3
   → Alert badge appears
   → Click "Buyurtma" creates Material Request in ERPNext

4. Preventive schedule
   - CIP cleaning every 7 days
   → Next due date highlighted if today
   - Mark complete → new maintenance log created
   → Last performed updated, next due += 7 days

5. OEE dashboard
   - Daily OEE measurement entered
   - Availability = (Planned - Downtime) / Planned
   - Performance = Actual / Capacity
   - Quality = Good / Total
   - OEE = A × P × Q
   → Show per-asset OEE bars
   → Highlight assets < 60% OEE in red

6. Downtime impact
   - Maintenance log saved with 4-hour downtime on AST-002
   → Find active Work Orders using AST-002's workstation
   → Show "WO-042 will be delayed by 4 hours"

7. Mechanic performance
   - View mechanics list
   - For each: total repairs, avg duration, success rate
   - Identify top performer and recurring issues

Use existing stack:
- shadcn/ui components
- TanStack Query/Table
- Zustand for dialog state
- recharts for OEE trends
- next-intl for i18n
- formatNumber utility for all amounts

Run npm run build — must pass with no errors.
Push when done per AGENTS.md.
```
