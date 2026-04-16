import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type {
  WorkOrder,
  WorkOrderListItem,
  BOM,
  BOMListItem,
  JobCard,
  JobCardListItem,
  Workstation,
  WorkstationListItem,
} from "@/types/manufacturing";
import type { StockEntryListItem } from "@/types/stock-entry";
import type { WorkOrderFormValues, BOMFormValues } from "@/lib/schemas/manufacturing-schemas";

const PAGE_SIZE = 20;

// ── Work Orders ─────────────────────────────────────────────

export function useWorkOrderList(
  company: string,
  page: number,
  search: string,
  sort: string,
  extraFilters?: unknown[],
) {
  return useQuery({
    queryKey: queryKeys.manufacturing.workOrders.list(company, page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) filters.push(["item_name", "like", `%${search}%`]);
      if (extraFilters) filters.push(...extraFilters);
      return frappe.getList<WorkOrderListItem>("Work Order", {
        filters,
        fields: [
          "name",
          "production_item",
          "item_name",
          "bom_no",
          "qty",
          "produced_qty",
          "status",
          "planned_start_date",
          "expected_delivery_date",
          "company",
          "docstatus",
        ],
        orderBy: sort || "planned_start_date desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useWorkOrderCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.workOrders.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) filters.push(["item_name", "like", `%${search}%`]);
      return frappe.getCount("Work Order", filters);
    },
    enabled: !!company,
  });
}

export function useWorkOrder(name: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.workOrders.detail(name),
    queryFn: () => frappe.getDoc<WorkOrder>("Work Order", name),
    enabled: !!name,
  });
}

export function useActiveWorkOrders(company: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.workOrders.active(company),
    queryFn: () =>
      frappe.getList<WorkOrderListItem>("Work Order", {
        filters: [
          ["company", "=", company],
          ["status", "in", ["Not Started", "In Process"]],
        ],
        fields: [
          "name",
          "production_item",
          "item_name",
          "bom_no",
          "qty",
          "produced_qty",
          "status",
          "planned_start_date",
          "expected_delivery_date",
          "company",
          "docstatus",
        ],
        orderBy: "planned_start_date asc",
        limitPageLength: 50,
      }),
    enabled: !!company,
    refetchInterval: 15_000,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkOrderFormValues) =>
      frappe.createDoc<WorkOrder>("Work Order", {
        doctype: "Work Order",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "workOrders"] });
    },
  });
}

export function useSubmitWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<WorkOrder>("Work Order", name);
      return frappe.submit<WorkOrder>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "workOrders"] });
      qc.invalidateQueries({ queryKey: ["manufacturing", "jobCards"] });
    },
  });
}

export function useStopWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      frappe.call("frappe.client.set_value", {
        doctype: "Work Order",
        name,
        fieldname: "status",
        value: "Stopped",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "workOrders"] });
    },
  });
}

export function useMakeStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workOrder,
      purpose,
      qty,
    }: {
      workOrder: string;
      purpose: "Manufacture" | "Material Transfer for Manufacture";
      qty?: number;
    }) => {
      const se = await frappe.call<Record<string, unknown>>(
        "erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry",
        { work_order: workOrder, purpose, qty },
      );
      return frappe.submit(se);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "workOrders"] });
      qc.invalidateQueries({ queryKey: ["manufacturing", "manufactureEntries"] });
      qc.invalidateQueries({ queryKey: ["stockEntries"] });
      qc.invalidateQueries({ queryKey: ["bins"] });
    },
  });
}

// ── Manufacture Entries (Production page) ──────────────────

export interface ManufactureEntryRow {
  name: string;
  posting_date: string;
  work_order: string;
  item_code: string;
  item_name: string;
  qty: number;
  fg_warehouse: string;
  status: string;
}

export function useManufactureEntries(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.manufactureEntries.list(company, page, search, sort),
    queryFn: async () => {
      const filters: unknown[] = [
        ["company", "=", company],
        ["stock_entry_type", "=", "Manufacture"],
        ["docstatus", "=", 1],
      ];
      if (search) {
        filters.push(["work_order", "like", `%${search}%`]);
      }

      const entries = await frappe.getList<StockEntryListItem & { work_order?: string }>(
        "Stock Entry",
        {
          filters,
          fields: [
            "name",
            "posting_date",
            "work_order",
            "stock_entry_type",
            "total_amount",
            "status",
            "docstatus",
          ],
          orderBy: sort || "posting_date desc",
          limitPageLength: PAGE_SIZE,
          limitStart: (page - 1) * PAGE_SIZE,
        },
      );

      if (entries.length === 0) return [];

      // Fetch finished-good item details in one call
      const entryNames = entries.map((e) => e.name);
      const items = await frappe.getList<{
        parent: string;
        item_code: string;
        item_name: string;
        qty: number;
        t_warehouse: string;
        is_finished_item: number;
      }>("Stock Entry Detail", {
        filters: [
          ["parent", "in", entryNames],
          ["is_finished_item", "=", 1],
        ],
        fields: ["parent", "item_code", "item_name", "qty", "t_warehouse", "is_finished_item"],
        limitPageLength: entryNames.length,
      });

      const itemMap = new Map(items.map((i) => [i.parent, i]));

      return entries.map((entry): ManufactureEntryRow => {
        const fg = itemMap.get(entry.name);
        return {
          name: entry.name,
          posting_date: entry.posting_date,
          work_order: entry.work_order ?? "",
          item_code: fg?.item_code ?? "",
          item_name: fg?.item_name ?? "",
          qty: fg?.qty ?? 0,
          fg_warehouse: fg?.t_warehouse ?? "",
          status: entry.status,
        };
      });
    },
    enabled: !!company,
  });
}

export function useManufactureEntryCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.manufactureEntries.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [
        ["company", "=", company],
        ["stock_entry_type", "=", "Manufacture"],
        ["docstatus", "=", 1],
      ];
      if (search) {
        filters.push(["work_order", "like", `%${search}%`]);
      }
      return frappe.getCount("Stock Entry", filters);
    },
    enabled: !!company,
  });
}

// ── BOMs ────────────────────────────────────────────────────

export function useBOMList(page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.boms.list(page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [];
      if (search) filters.push(["item_name", "like", `%${search}%`]);
      return frappe.getList<BOMListItem>("BOM", {
        filters,
        fields: [
          "name",
          "item",
          "item_name",
          "quantity",
          "is_active",
          "is_default",
          "total_cost",
          "raw_material_cost",
          "operating_cost",
        ],
        orderBy: sort || "modified desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
  });
}

export function useBOMCount(search: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.boms.count(search),
    queryFn: () => {
      const filters: unknown[] = [];
      if (search) filters.push(["item_name", "like", `%${search}%`]);
      return frappe.getCount("BOM", filters);
    },
  });
}

export function useBOM(name: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.boms.detail(name),
    queryFn: () => frappe.getDoc<BOM>("BOM", name),
    enabled: !!name,
  });
}

export function useCreateBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BOMFormValues) =>
      frappe.createDoc<BOM>("BOM", {
        doctype: "BOM",
        ...data,
        items: data.items.map((item) => ({ doctype: "BOM Item", ...item })),
        operations: data.operations?.map((op) => ({ doctype: "BOM Operation", ...op })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "boms"] });
    },
  });
}

export function useUpdateBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<BOMFormValues> }) => {
      const doc = await frappe.getDoc<BOM>("BOM", name);
      return frappe.save<BOM>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "boms"] });
    },
  });
}

export function useSubmitBOM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<BOM>("BOM", name);
      return frappe.submit<BOM>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "boms"] });
    },
  });
}

// ── Job Cards ───────────────────────────────────────────────

export function useJobCardList(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.jobCards.list(company, page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) filters.push(["operation", "like", `%${search}%`]);
      return frappe.getList<JobCardListItem>("Job Card", {
        filters,
        fields: [
          "name",
          "work_order",
          "operation",
          "workstation",
          "for_quantity",
          "total_completed_qty",
          "status",
          "production_item",
          "item_name",
        ],
        orderBy: sort || "modified desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useJobCardCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.jobCards.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) filters.push(["operation", "like", `%${search}%`]);
      return frappe.getCount("Job Card", filters);
    },
    enabled: !!company,
  });
}

export function useJobCard(name: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.jobCards.detail(name),
    queryFn: () => frappe.getDoc<JobCard>("Job Card", name),
    enabled: !!name,
  });
}

export function useStartJobCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<JobCard>("Job Card", name);
      const timeLogs = [...(doc.time_logs || []), { from_time: new Date().toISOString() }];
      return frappe.save<JobCard>({
        ...(doc as unknown as Record<string, unknown>),
        status: "Work In Progress",
        time_logs: timeLogs,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "jobCards"] });
    },
  });
}

export function useCompleteJobCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      completedQty,
      timeInMins,
    }: {
      name: string;
      completedQty: number;
      timeInMins: number;
    }) => {
      const doc = await frappe.getDoc<JobCard>("Job Card", name);
      const timeLogs = doc.time_logs || [];
      const lastLog = timeLogs[timeLogs.length - 1];
      if (lastLog && !lastLog.to_time) {
        lastLog.to_time = new Date().toISOString();
        lastLog.time_in_mins = timeInMins;
        lastLog.completed_qty = completedQty;
      }
      return frappe.save<JobCard>({
        ...(doc as unknown as Record<string, unknown>),
        status: "Completed",
        time_logs: timeLogs,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing", "jobCards"] });
      qc.invalidateQueries({ queryKey: ["manufacturing", "workOrders"] });
    },
  });
}

// ── Workstations ────────────────────────────────────────────

export function useWorkstationList(page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.workstations.list(page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [];
      if (search) filters.push(["workstation_name", "like", `%${search}%`]);
      return frappe.getList<WorkstationListItem>("Workstation", {
        filters,
        fields: ["name", "workstation_name", "workstation_type", "hour_rate"],
        orderBy: sort || "workstation_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
  });
}

export function useWorkstationCount(search: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.workstations.count(search),
    queryFn: () => {
      const filters: unknown[] = [];
      if (search) filters.push(["workstation_name", "like", `%${search}%`]);
      return frappe.getCount("Workstation", filters);
    },
  });
}

export function useWorkstation(name: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.workstations.detail(name),
    queryFn: () => frappe.getDoc<Workstation>("Workstation", name),
    enabled: !!name,
  });
}

// ── Dashboard Aggregates ────────────────────────────────────

export function useProductionMetrics(company: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.dashboard.metrics(company),
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [active, pending, completed] = await Promise.all([
        frappe.getCount("Work Order", [
          ["company", "=", company],
          ["status", "=", "In Process"],
        ]),
        frappe.getCount("Work Order", [
          ["company", "=", company],
          ["status", "=", "Not Started"],
        ]),
        frappe.getCount("Work Order", [
          ["company", "=", company],
          ["status", "=", "Completed"],
          ["modified", ">=", today],
        ]),
      ]);
      return { active, pending, completed };
    },
    enabled: !!company,
    refetchInterval: 15_000,
  });
}

export function useRawMaterialStatus(company: string, warehouse?: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.dashboard.materialStatus(company),
    queryFn: async () => {
      const filters: unknown[] = [["actual_qty", ">", 0]];
      if (warehouse) filters.push(["warehouse", "=", warehouse]);
      const bins = await frappe.getList<{
        item_code: string;
        actual_qty: number;
        stock_uom: string;
        valuation_rate: number;
        warehouse: string;
      }>("Bin", {
        filters,
        fields: ["item_code", "actual_qty", "stock_uom", "valuation_rate", "warehouse"],
        limitPageLength: 100,
      });
      const uniqueCodes = [...new Set(bins.map((b) => b.item_code))];
      if (uniqueCodes.length === 0) return [];
      const items = await frappe.getList<{ name: string; item_name: string }>("Item", {
        filters: [["name", "in", uniqueCodes]],
        fields: ["name", "item_name"],
        limitPageLength: uniqueCodes.length,
      });
      const nameMap = new Map(items.map((i) => [i.name, i.item_name]));
      return bins.map((b) => ({ ...b, item_name: nameMap.get(b.item_code) ?? b.item_code }));
    },
    enabled: !!company,
    refetchInterval: 30_000,
  });
}

export function useWorkstationStatus(company: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.dashboard.workstationStatus(company),
    queryFn: () =>
      frappe.getList<JobCardListItem>("Job Card", {
        filters: [
          ["company", "=", company],
          ["status", "=", "Work In Progress"],
        ],
        fields: [
          "name",
          "work_order",
          "operation",
          "workstation",
          "for_quantity",
          "total_completed_qty",
          "status",
          "production_item",
          "item_name",
        ],
        limitPageLength: 100,
      }),
    enabled: !!company,
    refetchInterval: 15_000,
  });
}
