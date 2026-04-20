import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { CostingPeriod } from "@/types/costing";

interface WOTimesheetRow {
  name: string;
  work_order: string;
  date: string;
  employee: string;
  employee_name: string;
  hours: number;
  hourly_rate: number;
  amount: number;
}

interface WorkOrderRow {
  name: string;
  production_item: string;
  item_name: string;
  qty: number;
  produced_qty: number;
  company: string;
}

export interface LaborReportEmployeeRow {
  employee: string;
  employee_name: string;
  hours: number;
  cost: number;
  avgRate: number;
  workOrdersTouched: number;
}

export interface LaborReportWorkOrderRow {
  workOrder: string;
  productCode: string;
  productName: string;
  qty: number;
  producedQty: number;
  hours: number;
  cost: number;
  costPerUnit: number;
}

export interface LaborReportProductRow {
  productCode: string;
  productName: string;
  totalProducedQty: number;
  hours: number;
  cost: number;
  costPerUnit: number;
}

export interface LaborReportEntry {
  name: string;
  date: string;
  workOrder: string;
  productName: string;
  hours: number;
  cost: number;
}

export interface LaborReport {
  byEmployee: LaborReportEmployeeRow[];
  byWorkOrder: LaborReportWorkOrderRow[];
  byProduct: LaborReportProductRow[];
  entriesByEmployee: Record<string, LaborReportEntry[]>;
  kpi: {
    totalHours: number;
    totalCost: number;
    activeWorkers: number;
  };
}

export function useLaborReport(period: CostingPeriod, company: string) {
  return useQuery<LaborReport>({
    queryKey: queryKeys.costing.laborReport(period.from, period.to, company),
    queryFn: async () => {
      const entries = await frappe.getList<WOTimesheetRow>("Work Order Timesheet", {
        filters: [
          ["date", ">=", period.from],
          ["date", "<=", period.to],
        ],
        fields: [
          "name",
          "work_order",
          "date",
          "employee",
          "employee_name",
          "hours",
          "hourly_rate",
          "amount",
        ],
        limitPageLength: 0,
      });

      if (entries.length === 0) {
        return {
          byEmployee: [],
          byWorkOrder: [],
          byProduct: [],
          entriesByEmployee: {},
          kpi: { totalHours: 0, totalCost: 0, activeWorkers: 0 },
        };
      }

      const woNames = Array.from(new Set(entries.map((e) => e.work_order)));
      const workOrders = await frappe.getList<WorkOrderRow>("Work Order", {
        filters: [
          ["name", "in", woNames],
          ["company", "=", company],
        ],
        fields: ["name", "production_item", "item_name", "qty", "produced_qty", "company"],
        limitPageLength: 0,
      });

      const woMap = new Map(workOrders.map((wo) => [wo.name, wo]));
      // Filter entries to only those whose WO matches the selected company
      const scoped = entries.filter((e) => woMap.has(e.work_order));

      // ── By Employee ───────────────────────────────────────
      const byEmployeeMap = new Map<
        string,
        { employee_name: string; hours: number; cost: number; wos: Set<string> }
      >();
      const entriesByEmployee: Record<string, LaborReportEntry[]> = {};

      for (const e of scoped) {
        const prev = byEmployeeMap.get(e.employee);
        if (prev) {
          prev.hours += e.hours;
          prev.cost += e.amount;
          prev.wos.add(e.work_order);
        } else {
          byEmployeeMap.set(e.employee, {
            employee_name: e.employee_name,
            hours: e.hours,
            cost: e.amount,
            wos: new Set([e.work_order]),
          });
        }

        const wo = woMap.get(e.work_order);
        const list = entriesByEmployee[e.employee] ?? (entriesByEmployee[e.employee] = []);
        list.push({
          name: e.name,
          date: e.date,
          workOrder: e.work_order,
          productName: wo?.item_name ?? "",
          hours: e.hours,
          cost: e.amount,
        });
      }

      const byEmployee: LaborReportEmployeeRow[] = Array.from(byEmployeeMap.entries())
        .map(([employee, v]) => ({
          employee,
          employee_name: v.employee_name,
          hours: v.hours,
          cost: v.cost,
          avgRate: v.hours > 0 ? v.cost / v.hours : 0,
          workOrdersTouched: v.wos.size,
        }))
        .sort((a, b) => b.cost - a.cost);

      // ── By Work Order ────────────────────────────────────
      const byWoMap = new Map<string, { hours: number; cost: number }>();
      for (const e of scoped) {
        const prev = byWoMap.get(e.work_order);
        if (prev) {
          prev.hours += e.hours;
          prev.cost += e.amount;
        } else {
          byWoMap.set(e.work_order, { hours: e.hours, cost: e.amount });
        }
      }
      const byWorkOrder: LaborReportWorkOrderRow[] = Array.from(byWoMap.entries())
        .map(([woName, v]) => {
          const wo = woMap.get(woName);
          const producedQty = wo?.produced_qty ?? 0;
          return {
            workOrder: woName,
            productCode: wo?.production_item ?? "",
            productName: wo?.item_name ?? "",
            qty: wo?.qty ?? 0,
            producedQty,
            hours: v.hours,
            cost: v.cost,
            costPerUnit: producedQty > 0 ? v.cost / producedQty : 0,
          };
        })
        .sort((a, b) => b.cost - a.cost);

      // ── By Product ───────────────────────────────────────
      const byProductMap = new Map<
        string,
        { productName: string; producedQty: number; hours: number; cost: number }
      >();
      for (const row of byWorkOrder) {
        const key = row.productCode || row.productName;
        if (!key) continue;
        const prev = byProductMap.get(key);
        if (prev) {
          prev.producedQty += row.producedQty;
          prev.hours += row.hours;
          prev.cost += row.cost;
        } else {
          byProductMap.set(key, {
            productName: row.productName,
            producedQty: row.producedQty,
            hours: row.hours,
            cost: row.cost,
          });
        }
      }
      const byProduct: LaborReportProductRow[] = Array.from(byProductMap.entries())
        .map(([productCode, v]) => ({
          productCode,
          productName: v.productName,
          totalProducedQty: v.producedQty,
          hours: v.hours,
          cost: v.cost,
          costPerUnit: v.producedQty > 0 ? v.cost / v.producedQty : 0,
        }))
        .sort((a, b) => b.cost - a.cost);

      const totalHours = scoped.reduce((s, e) => s + e.hours, 0);
      const totalCost = scoped.reduce((s, e) => s + e.amount, 0);

      return {
        byEmployee,
        byWorkOrder,
        byProduct,
        entriesByEmployee,
        kpi: {
          totalHours,
          totalCost,
          activeWorkers: byEmployee.length,
        },
      };
    },
    enabled: !!company && !!period.from && !!period.to,
  });
}
