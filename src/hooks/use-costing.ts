import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import { getMaintenanceCostsForPeriod } from "@/actions/maintenance-logs";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { roundTo2 } from "@/lib/utils/multi-currency";
import type { EmployeeCostInfo, TimesheetEntry, CostingPeriod } from "@/types/costing";
import type { WorkOrderListItem } from "@/types/manufacturing";
import type { JournalEntry } from "@/types/journal-entry";

// ── Employee Cost Info ──────────────────────────────────────

export function useEmployeeCostInfo(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.costing.employeeCost(employeeId),
    queryFn: () => frappe.getDoc<EmployeeCostInfo>("Employee", employeeId),
    enabled: !!employeeId,
  });
}

export function useDirectLaborEmployees() {
  return useQuery({
    queryKey: queryKeys.costing.directLaborEmployees,
    queryFn: () =>
      frappe.getList<EmployeeCostInfo>("Employee", {
        filters: [
          ["custom_cost_classification", "=", "Direct Labor"],
          ["status", "=", "Active"],
        ],
        fields: [
          "name",
          "employee_name",
          "custom_monthly_salary",
          "custom_standard_hours",
          "custom_hourly_cost",
          "custom_cost_classification",
          "custom_default_workstation",
          "department",
        ],
        limitPageLength: 0,
      }),
  });
}

export function useUpdateEmployeeCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      monthly_salary: number;
      standard_hours: number;
      cost_classification: "Direct Labor" | "Period Cost";
      default_workstation?: string;
    }) => {
      const hourly = Math.round(params.monthly_salary / params.standard_hours);
      const doc = await frappe.getDoc<Record<string, unknown>>("Employee", params.employeeId);
      return frappe.save<EmployeeCostInfo>({
        ...doc,
        custom_monthly_salary: params.monthly_salary,
        custom_standard_hours: params.standard_hours,
        custom_hourly_cost: hourly,
        custom_cost_classification: params.cost_classification,
        custom_default_workstation: params.default_workstation || undefined,
      });
    },
    onSuccess: (savedDoc, vars) => {
      qc.setQueryData(queryKeys.costing.employeeCost(vars.employeeId), savedDoc);
      qc.invalidateQueries({ queryKey: queryKeys.costing.directLaborEmployees });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

// ── Work Order Tabel ────────────────────────────────────────

interface WOTimesheetDoc {
  name: string;
  work_order: string;
  date: string;
  employee: string;
  employee_name: string;
  operation?: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  amount: number;
}

export function useWorkOrderTabel(workOrderName: string) {
  return useQuery({
    queryKey: queryKeys.costing.woTabel(workOrderName),
    queryFn: () =>
      frappe.getList<WOTimesheetDoc>("Work Order Timesheet", {
        filters: [["work_order", "=", workOrderName]],
        fields: [
          "name",
          "work_order",
          "date",
          "employee",
          "employee_name",
          "operation",
          "start_time",
          "end_time",
          "hours",
          "hourly_rate",
          "amount",
        ],
        orderBy: "date asc, start_time asc",
        limitPageLength: 0,
      }),
    enabled: !!workOrderName,
  });
}

// ── Labor Accrual (auto-posted JE per WO+date) ─────────────
// Mirrors the salary-accrual pattern: tag the JE in user_remark with
// `[LABOR-ACCRUAL:<WO>:<date>]` so we can find-cancel-delete-recreate on
// every tabel save. Debits labor expense, credits Employee Payable per
// employee (party_type=Employee) so `/employees` balances grow as hours
// are logged.

export class LaborAccrualConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaborAccrualConfigError";
  }
}

export interface LaborAccrualResult {
  date: string;
  employeeCount: number;
  totalAmount: number;
  jeName: string | null;
  error?: string;
}

async function findLaborAccrualJE(
  workOrder: string,
  date: string,
  company: string,
): Promise<{ name: string; docstatus: 0 | 1 | 2 } | null> {
  const tag = `[LABOR-ACCRUAL:${workOrder}:${date}]`;
  const results = await frappe.getList<{ name: string; docstatus: 0 | 1 | 2 }>("Journal Entry", {
    filters: [
      ["company", "=", company],
      ["user_remark", "like", `%${tag}%`],
    ],
    fields: ["name", "docstatus"],
    limitPageLength: 5,
  });
  return results[0] ?? null;
}

export async function accrueLaborForDate(
  workOrder: string,
  date: string,
  company: string,
): Promise<LaborAccrualResult> {
  const settings = useUISettingsStore.getState().getCompanySettings(company);
  const expenseAccount = settings.salaryExpenseAccount;
  const payableAccount = settings.salaryPayableAccount;
  if (!expenseAccount || !payableAccount) {
    throw new LaborAccrualConfigError(
      "Configure Salary Expense + Payable accounts in Company settings.",
    );
  }

  const entries = await frappe.getList<{
    employee: string;
    employee_name: string;
    amount: number;
  }>("Work Order Timesheet", {
    filters: [
      ["work_order", "=", workOrder],
      ["date", "=", date],
    ],
    fields: ["employee", "employee_name", "amount"],
    limitPageLength: 0,
  });

  const employeeTotals = new Map<string, number>();
  for (const row of entries) {
    const prev = employeeTotals.get(row.employee) ?? 0;
    employeeTotals.set(row.employee, roundTo2(prev + (row.amount || 0)));
  }
  const totalAmount = roundTo2(Array.from(employeeTotals.values()).reduce((s, a) => s + a, 0));

  const existing = await findLaborAccrualJE(workOrder, date, company);

  // No labor remaining for this (WO, date) — tear down any existing JE.
  if (employeeTotals.size === 0 || totalAmount === 0) {
    if (existing) {
      if (existing.docstatus === 1) {
        await frappe.cancel("Journal Entry", existing.name);
      }
      if (existing.docstatus !== 2) {
        await frappe.deleteDoc("Journal Entry", existing.name);
      }
    }
    return { date, employeeCount: 0, totalAmount: 0, jeName: null };
  }

  // Rebuild: cancel+delete any prior tagged JE, then create fresh.
  if (existing) {
    if (existing.docstatus === 1) {
      await frappe.cancel("Journal Entry", existing.name);
    }
    await frappe.deleteDoc("Journal Entry", existing.name);
  }

  const userRemark = `Labor accrual ${workOrder} on ${date} [LABOR-ACCRUAL:${workOrder}:${date}]`;

  const accounts = [
    {
      doctype: "Journal Entry Account" as const,
      account: expenseAccount,
      debit_in_account_currency: totalAmount,
    },
    ...Array.from(employeeTotals.entries()).map(([empId, amount]) => ({
      doctype: "Journal Entry Account" as const,
      account: payableAccount,
      party_type: "Employee" as const,
      party: empId,
      credit_in_account_currency: amount,
    })),
  ];

  const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
    doctype: "Journal Entry",
    voucher_type: "Journal Entry",
    naming_series: "ACC-JV-.YYYY.-",
    posting_date: date,
    company,
    user_remark: userRemark,
    accounts,
  });

  await frappe.submitWithRetry<JournalEntry>("Journal Entry", created.name);

  return {
    date,
    employeeCount: employeeTotals.size,
    totalAmount,
    jeName: created.name,
  };
}

// Backfill: scan every (WO,date) with tabel rows and (re)post the accrual
// JE. Used to heal existing tabel data that predates this feature — and as
// a manual "resync" escape hatch from the work orders page.
export function useBackfillLaborAccruals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (company: string) => {
      const rows = await frappe.getList<{ work_order: string; date: string }>(
        "Work Order Timesheet",
        {
          filters: [["work_order", "is", "set"]],
          fields: ["work_order", "date"],
          limitPageLength: 0,
        },
      );
      const pairs = new Set<string>();
      for (const r of rows) {
        if (r.work_order && r.date) pairs.add(`${r.work_order}::${r.date}`);
      }
      const accruals: LaborAccrualResult[] = [];
      const accrualErrors: SaveWorkOrderTabelResult["accrualErrors"] = [];
      for (const key of pairs) {
        const [workOrder, date] = key.split("::");
        try {
          const result = await accrueLaborForDate(workOrder, date, company);
          accruals.push(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          accrualErrors.push({
            date: `${workOrder} ${date}`,
            message,
            configError: err instanceof LaborAccrualConfigError,
          });
          if (err instanceof LaborAccrualConfigError) break;
        }
      }
      return { accruals, accrualErrors, scanned: pairs.size };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export interface SaveWorkOrderTabelResult {
  accruals: LaborAccrualResult[];
  accrualErrors: Array<{ date: string; message: string; configError: boolean }>;
}

export function useSaveWorkOrderTabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      work_order: string;
      company: string;
      entries: TimesheetEntry[];
    }): Promise<SaveWorkOrderTabelResult> => {
      // Labor totals are aggregated client-side from Work Order Timesheet
      // rows (see useWoTabelSummaries) — we do NOT write them back to the
      // Work Order, since submitted (Completed) WOs would reject the update
      // unless the custom fields carry allow_on_submit.
      const dirtyDates = new Set<string>();
      for (const entry of params.entries) {
        if (entry.name) {
          // Update existing
          const doc = await frappe.getDoc<Record<string, unknown>>(
            "Work Order Timesheet",
            entry.name,
          );
          // The row's previous date may differ from the new one — accrue both.
          const prevDate = typeof doc.date === "string" ? doc.date : null;
          if (prevDate && prevDate !== entry.date) dirtyDates.add(prevDate);
          await frappe.save({
            ...doc,
            date: entry.date,
            employee: entry.employee,
            employee_name: entry.employee_name,
            operation: entry.operation,
            start_time: entry.start_time,
            end_time: entry.end_time,
            hours: entry.hours,
            hourly_rate: entry.hourly_rate,
            amount: entry.amount,
          });
        } else {
          await frappe.createDoc("Work Order Timesheet", {
            doctype: "Work Order Timesheet",
            work_order: params.work_order,
            date: entry.date,
            employee: entry.employee,
            employee_name: entry.employee_name,
            operation: entry.operation,
            start_time: entry.start_time,
            end_time: entry.end_time,
            hours: entry.hours,
            hourly_rate: entry.hourly_rate,
            amount: entry.amount,
          });
        }
        dirtyDates.add(entry.date);
      }

      // Auto-post labor accrual JE per unique (WO, date). Failures do not
      // roll back the tabel save — they surface as warnings on the toast.
      const accruals: LaborAccrualResult[] = [];
      const accrualErrors: SaveWorkOrderTabelResult["accrualErrors"] = [];
      for (const date of dirtyDates) {
        try {
          const result = await accrueLaborForDate(params.work_order, date, params.company);
          accruals.push(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          accrualErrors.push({
            date,
            message,
            configError: err instanceof LaborAccrualConfigError,
          });
        }
      }

      return { accruals, accrualErrors };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.costing.woTabel(vars.work_order) });
      qc.invalidateQueries({
        queryKey: queryKeys.manufacturing.workOrders.detail(vars.work_order),
      });
      qc.invalidateQueries({ queryKey: ["manufacturing", "workOrders"] });
      qc.invalidateQueries({ queryKey: ["costing", "laborReport"] });
      // List view reads labor totals from this derived summary.
      qc.invalidateQueries({ queryKey: ["costing", "tabelSummaries"] });
      // Accrual JE touches employee ledger → refresh balance-aware views.
      qc.invalidateQueries({ queryKey: ["journalEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── Tabel Summaries (bulk for list view) ───────────────────

export interface TabelSummary {
  employees: { id: string; name: string; initials: string }[];
  totalHours: number;
  totalCost: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function useWoTabelSummaries(workOrderNames: string[]) {
  // Only fetch for WOs that actually have labor hours > 0
  return useQuery({
    queryKey: queryKeys.costing.tabelSummaries(workOrderNames),
    queryFn: async () => {
      if (workOrderNames.length === 0) return {} as Record<string, TabelSummary>;
      const entries = await frappe.getList<{
        work_order: string;
        employee: string;
        employee_name: string;
        hours: number;
        amount: number;
      }>("Work Order Timesheet", {
        filters: [["work_order", "in", workOrderNames]],
        fields: ["work_order", "employee", "employee_name", "hours", "amount"],
        limitPageLength: 0,
      });

      const map: Record<string, TabelSummary> = {};
      for (const entry of entries) {
        if (!map[entry.work_order]) {
          map[entry.work_order] = { employees: [], totalHours: 0, totalCost: 0 };
        }
        const summary = map[entry.work_order];
        summary.totalHours += entry.hours;
        summary.totalCost += entry.amount || 0;
        // Add unique employees only
        if (!summary.employees.some((e) => e.id === entry.employee)) {
          summary.employees.push({
            id: entry.employee,
            name: entry.employee_name,
            initials: getInitials(entry.employee_name),
          });
        }
      }
      return map;
    },
    enabled: workOrderNames.length > 0,
  });
}

// ── Labor Totals (shared helper) ────────────────────────────
// Aggregates labor cost + hours per Work Order directly from the
// `Work Order Timesheet` doctype. We don't cache these on the WO any more
// because writing back fails on submitted (Completed) WOs without the
// `allow_on_submit=1` flag on the custom fields. See useSaveWorkOrderTabel.

export async function fetchLaborTotalsByWorkOrder(
  workOrderNames: string[],
): Promise<Map<string, { cost: number; hours: number }>> {
  const map = new Map<string, { cost: number; hours: number }>();
  if (workOrderNames.length === 0) return map;
  const rows = await frappe.getList<{
    work_order: string;
    hours: number;
    amount: number;
  }>("Work Order Timesheet", {
    filters: [["work_order", "in", workOrderNames]],
    fields: ["work_order", "hours", "amount"],
    limitPageLength: 0,
  });
  for (const r of rows) {
    const entry = map.get(r.work_order) ?? { cost: 0, hours: 0 };
    entry.cost += r.amount || 0;
    entry.hours += r.hours || 0;
    map.set(r.work_order, entry);
  }
  return map;
}

// ── Costing Dashboard ───────────────────────────────────────

export function useCumulativeCosts(period: CostingPeriod, company: string) {
  return useQuery({
    queryKey: queryKeys.costing.cumulativeCosts(period.from, period.to),
    queryFn: async () => {
      // Fetch completed work orders in the period with their costs
      const workOrders = await frappe.getList<
        WorkOrderListItem & {
          total_operating_cost?: number;
        }
      >("Work Order", {
        filters: [
          ["company", "=", company],
          ["status", "=", "Completed"],
          ["modified", ">=", period.from],
          ["modified", "<=", period.to],
        ],
        fields: [
          "name",
          "production_item",
          "item_name",
          "qty",
          "produced_qty",
          "total_operating_cost",
        ],
        limitPageLength: 0,
      });

      // Fetch stock entries for raw material costs
      const seFilters: unknown[] = [
        ["company", "=", company],
        ["stock_entry_type", "=", "Manufacture"],
        ["docstatus", "=", 1],
        ["posting_date", ">=", period.from],
        ["posting_date", "<=", period.to],
      ];
      const stockEntries = await frappe.getList<{
        name: string;
        total_amount: number;
        work_order: string;
      }>("Stock Entry", {
        filters: seFilters,
        fields: ["name", "total_amount", "work_order"],
        limitPageLength: 0,
      });

      const laborTotals = await fetchLaborTotalsByWorkOrder(workOrders.map((w) => w.name));

      const rawMaterials = stockEntries.reduce((s, e) => s + (e.total_amount || 0), 0);
      const labor = workOrders.reduce((s, wo) => s + (laborTotals.get(wo.name)?.cost ?? 0), 0);

      // Energy and depreciation are approximations from operating cost minus labor
      const totalOperating = workOrders.reduce((s, wo) => s + (wo.total_operating_cost || 0), 0);
      const energy = Math.round(totalOperating * 0.4);
      const depreciation = Math.round(totalOperating * 0.6);

      return {
        raw_materials: rawMaterials,
        labor,
        energy,
        depreciation,
        total: rawMaterials + labor + energy + depreciation,
      };
    },
    enabled: !!company && !!period.from && !!period.to,
  });
}

export function useProductCostBreakdown(
  period: CostingPeriod,
  company: string,
  allocationMethod: string,
) {
  return useQuery({
    queryKey: queryKeys.costing.productBreakdown(period.from, period.to, allocationMethod),
    queryFn: async () => {
      const workOrders = await frappe.getList<
        WorkOrderListItem & {
          total_operating_cost?: number;
          bom_no: string;
        }
      >("Work Order", {
        filters: [
          ["company", "=", company],
          ["status", "=", "Completed"],
          ["modified", ">=", period.from],
          ["modified", "<=", period.to],
        ],
        fields: [
          "name",
          "production_item",
          "item_name",
          "qty",
          "produced_qty",
          "total_operating_cost",
          "bom_no",
        ],
        limitPageLength: 0,
      });

      const laborTotals = await fetchLaborTotalsByWorkOrder(workOrders.map((w) => w.name));

      // Group by production item
      const byProduct = new Map<
        string,
        {
          item_code: string;
          item_name: string;
          produced_qty: number;
          labor_cost: number;
          labor_hours: number;
          operating_cost: number;
        }
      >();

      for (const wo of workOrders) {
        const key = wo.production_item;
        const existing = byProduct.get(key) ?? {
          item_code: key,
          item_name: wo.item_name,
          produced_qty: 0,
          labor_cost: 0,
          labor_hours: 0,
          operating_cost: 0,
        };
        const labor = laborTotals.get(wo.name);
        existing.produced_qty += wo.produced_qty || 0;
        existing.labor_cost += labor?.cost ?? 0;
        existing.labor_hours += labor?.hours ?? 0;
        existing.operating_cost += wo.total_operating_cost || 0;
        byProduct.set(key, existing);
      }

      // Fetch stock entries for raw material total
      const stockEntries = await frappe.getList<{
        name: string;
        total_amount: number;
        work_order: string;
      }>("Stock Entry", {
        filters: [
          ["company", "=", company],
          ["stock_entry_type", "=", "Manufacture"],
          ["docstatus", "=", 1],
          ["posting_date", ">=", period.from],
          ["posting_date", "<=", period.to],
        ],
        fields: ["name", "total_amount", "work_order"],
        limitPageLength: 0,
      });

      // Map stock entry costs to work orders
      const seCostByWO = new Map<string, number>();
      for (const se of stockEntries) {
        if (se.work_order) {
          seCostByWO.set(se.work_order, (seCostByWO.get(se.work_order) ?? 0) + se.total_amount);
        }
      }

      // Map raw material costs to products
      const rawByProduct = new Map<string, number>();
      for (const wo of workOrders) {
        const cost = seCostByWO.get(wo.name) ?? 0;
        rawByProduct.set(wo.production_item, (rawByProduct.get(wo.production_item) ?? 0) + cost);
      }

      const totalQty = Array.from(byProduct.values()).reduce((s, p) => s + p.produced_qty, 0);
      const totalHours = Array.from(byProduct.values()).reduce((s, p) => s + p.labor_hours, 0);
      const totalValue = Array.from(byProduct.values()).reduce(
        (s, p) => s + (rawByProduct.get(p.item_code) ?? 0) + p.labor_cost,
        0,
      );

      const totalEnergy = Array.from(byProduct.values()).reduce(
        (s, p) => s + Math.round(p.operating_cost * 0.4),
        0,
      );
      const totalDepr = Array.from(byProduct.values()).reduce(
        (s, p) => s + Math.round(p.operating_cost * 0.6),
        0,
      );

      return Array.from(byProduct.values()).map((p) => {
        const rawCost = rawByProduct.get(p.item_code) ?? 0;
        let share = 0;
        if (allocationMethod === "qty" && totalQty > 0) {
          share = p.produced_qty / totalQty;
        } else if (allocationMethod === "hours" && totalHours > 0) {
          share = p.labor_hours / totalHours;
        } else if (allocationMethod === "value" && totalValue > 0) {
          share = (rawCost + p.labor_cost) / totalValue;
        } else {
          share = totalQty > 0 ? p.produced_qty / totalQty : 0;
        }

        const energyCost = Math.round(totalEnergy * share);
        const deprCost = Math.round(totalDepr * share);
        const totalCost = rawCost + p.labor_cost + energyCost + deprCost;

        return {
          item_code: p.item_code,
          item_name: p.item_name,
          produced_qty: p.produced_qty,
          raw_material_cost: rawCost,
          labor_cost: p.labor_cost,
          energy_cost: energyCost,
          depreciation_cost: deprCost,
          total_cost: totalCost,
          cost_per_unit: p.produced_qty > 0 ? Math.round(totalCost / p.produced_qty) : 0,
        };
      });
    },
    enabled: !!company && !!period.from && !!period.to,
  });
}

export function useVarianceAnalysis(period: CostingPeriod, company: string) {
  return useQuery({
    queryKey: queryKeys.costing.variance(period.from, period.to),
    queryFn: async () => {
      // Absorbed = BOM standard cost × produced qty (from completed WOs)
      const workOrders = await frappe.getList<{
        name: string;
        bom_no: string;
        produced_qty: number;
        total_operating_cost: number;
      }>("Work Order", {
        filters: [
          ["company", "=", company],
          ["status", "=", "Completed"],
          ["modified", ">=", period.from],
          ["modified", "<=", period.to],
        ],
        fields: ["name", "bom_no", "produced_qty", "total_operating_cost"],
        limitPageLength: 0,
      });

      const laborTotals = await fetchLaborTotalsByWorkOrder(workOrders.map((w) => w.name));

      // Get BOM costs
      const bomNames = [...new Set(workOrders.map((w) => w.bom_no).filter(Boolean))];
      let bomCostMap = new Map<string, number>();
      if (bomNames.length > 0) {
        const boms = await frappe.getList<{ name: string; total_cost: number }>("BOM", {
          filters: [["name", "in", bomNames]],
          fields: ["name", "total_cost"],
          limitPageLength: bomNames.length,
        });
        bomCostMap = new Map(boms.map((b) => [b.name, b.total_cost]));
      }

      const absorbed = workOrders.reduce((s, wo) => {
        const bomCost = bomCostMap.get(wo.bom_no) ?? 0;
        return s + bomCost * (wo.produced_qty || 0);
      }, 0);

      // Actual = sum of labor + operating costs from WOs + stock entry raw material costs
      const stockEntries = await frappe.getList<{ total_amount: number }>("Stock Entry", {
        filters: [
          ["company", "=", company],
          ["stock_entry_type", "=", "Manufacture"],
          ["docstatus", "=", 1],
          ["posting_date", ">=", period.from],
          ["posting_date", "<=", period.to],
        ],
        fields: ["total_amount"],
        limitPageLength: 0,
      });

      const rawMaterial = stockEntries.reduce((s, e) => s + (e.total_amount || 0), 0);
      const laborTotal = workOrders.reduce((s, wo) => s + (laborTotals.get(wo.name)?.cost ?? 0), 0);
      const operatingTotal = workOrders.reduce((s, wo) => s + (wo.total_operating_cost || 0), 0);
      const actual = rawMaterial + laborTotal + operatingTotal;

      const variance = actual - absorbed;
      const variance_pct = absorbed > 0 ? (variance / absorbed) * 100 : 0;

      let recommendation: string;
      if (Math.abs(variance_pct) <= 5) {
        recommendation = "normal";
      } else if (variance_pct > 5) {
        recommendation = "under_absorbed";
      } else {
        recommendation = "over_absorbed";
      }

      return { absorbed, actual, variance, variance_pct, recommendation };
    },
    enabled: !!company && !!period.from && !!period.to,
  });
}

export function useWorkstationEnergyAllocation(period: CostingPeriod, company: string) {
  return useQuery({
    queryKey: queryKeys.costing.workstationEnergy(period.from, period.to),
    queryFn: async () => {
      const workstations = await frappe.getList<{
        name: string;
        custom_power_kw: number;
      }>("Workstation", {
        fields: ["name", "custom_power_kw"],
        limitPageLength: 0,
      });

      // Get total energy cost from work orders
      const workOrders = await frappe.getList<{ total_operating_cost: number }>("Work Order", {
        filters: [
          ["company", "=", company],
          ["status", "=", "Completed"],
          ["modified", ">=", period.from],
          ["modified", "<=", period.to],
        ],
        fields: ["total_operating_cost"],
        limitPageLength: 0,
      });

      const totalEnergy = workOrders.reduce(
        (s, wo) => s + Math.round((wo.total_operating_cost || 0) * 0.4),
        0,
      );

      const totalPower = workstations.reduce((s, w) => s + (w.custom_power_kw || 0), 0);

      return workstations
        .filter((w) => (w.custom_power_kw || 0) > 0)
        .map((w) => {
          const share = totalPower > 0 ? (w.custom_power_kw || 0) / totalPower : 0;
          const energyAmount = Math.round(totalEnergy * share);
          return {
            name: w.name,
            power_kw: w.custom_power_kw || 0,
            share_pct: Math.round(share * 10000) / 100,
            energy_amount: energyAmount,
            hourly_rate: Math.round(energyAmount / 176),
          };
        });
    },
    enabled: !!company && !!period.from && !!period.to,
  });
}

// ── Maintenance Costs (from local DB) ──────────────────────────

export function useMaintenanceCosts(period: CostingPeriod) {
  return useQuery({
    queryKey: queryKeys.costing.maintenanceCosts(period.from, period.to),
    queryFn: async () => {
      const result = await getMaintenanceCostsForPeriod(period.from, period.to);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!period.from && !!period.to,
  });
}
