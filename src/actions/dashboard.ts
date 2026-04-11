"use server";

import { db } from "@/db";
import { productionRuns, products, productionLines } from "@/db/schema";
import { eq, and, gte, lte, sql, asc, inArray } from "drizzle-orm";
import { calculateRunMetrics } from "@/lib/calculations";
import { requireGrant, toActionError } from "@/lib/permissions/require-grant";

// ─── Types ──────────────────────────────────────────────────────────

interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  lineIds?: number[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildRunConditions(filters?: DashboardFilters) {
  const conditions = [];

  if (filters?.dateFrom) {
    conditions.push(gte(productionRuns.date, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(productionRuns.date, filters.dateTo));
  }
  if (filters?.lineIds && filters.lineIds.length > 0) {
    conditions.push(inArray(productionRuns.lineId, filters.lineIds));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Given a date range, compute the "previous period" of equal length ending
 * the day before dateFrom.  If no dateFrom/dateTo is given, returns undefined.
 */
function getPreviousPeriod(dateFrom?: string, dateTo?: string) {
  if (!dateFrom || !dateTo) return undefined;

  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const durationMs = to.getTime() - from.getTime();

  const prevTo = new Date(from.getTime() - 86400000); // day before dateFrom
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  return {
    dateFrom: prevFrom.toISOString().slice(0, 10),
    dateTo: prevTo.toISOString().slice(0, 10),
  };
}

async function fetchRunsForPeriod(filters?: DashboardFilters) {
  const where = buildRunConditions(filters);

  return db
    .select({
      actualOutput: productionRuns.actualOutput,
      totalHours: productionRuns.totalHours,
      plannedStopHours: productionRuns.plannedStopHours,
      nominalSpeed: products.nominalSpeed,
    })
    .from(productionRuns)
    .leftJoin(products, eq(productionRuns.productId, products.id))
    .where(where);
}

function computeAggregates(
  rows: {
    actualOutput: number;
    totalHours: number;
    plannedStopHours: number | null;
    nominalSpeed: number | null;
  }[],
) {
  let totalOutput = 0;
  let totalNetWorkHours = 0;
  let totalPlannedWorkHours = 0;
  let totalHours = 0;
  let totalUnplannedStopHours = 0;

  for (const row of rows) {
    const metrics = calculateRunMetrics({
      actualOutput: row.actualOutput,
      totalHours: row.totalHours,
      plannedStopHours: row.plannedStopHours ?? 0,
      nominalSpeed: row.nominalSpeed ?? 0,
    });

    totalOutput += row.actualOutput;
    totalNetWorkHours += metrics.netWorkHours;
    totalPlannedWorkHours += metrics.plannedWorkHours;
    totalHours += row.totalHours;
    totalUnplannedStopHours += metrics.unplannedStopHours;
  }

  const productivity = totalPlannedWorkHours > 0 ? totalNetWorkHours / totalPlannedWorkHours : 0;
  const efficiency = totalHours > 0 ? totalNetWorkHours / totalHours : 0;

  return {
    productivity,
    efficiency,
    totalOutput,
    totalUnplannedDowntimeHours: totalUnplannedStopHours,
  };
}

// ─── Dashboard KPIs ─────────────────────────────────────────────────

export async function getDashboardKPIs(dateFrom?: string, dateTo?: string, lineIds?: number[]) {
  try {
    await requireGrant({
      capability: "dashboard.read",
      scope: { dim: null },
      actionName: "getDashboardKPIs",
    });

    const filters: DashboardFilters = { dateFrom, dateTo, lineIds };
    const currentRows = await fetchRunsForPeriod(filters);
    const current = computeAggregates(currentRows);

    // Previous period for trend comparison
    let previous = null;
    const prevPeriod = getPreviousPeriod(dateFrom, dateTo);
    if (prevPeriod) {
      const prevRows = await fetchRunsForPeriod({
        dateFrom: prevPeriod.dateFrom,
        dateTo: prevPeriod.dateTo,
        lineIds,
      });
      previous = computeAggregates(prevRows);
    }

    return {
      success: true as const,
      data: {
        productivity: current.productivity,
        efficiency: current.efficiency,
        totalOutput: current.totalOutput,
        totalUnplannedDowntimeHours: current.totalUnplannedDowntimeHours,
        previous: previous
          ? {
              productivity: previous.productivity,
              efficiency: previous.efficiency,
              totalOutput: previous.totalOutput,
              totalUnplannedDowntimeHours: previous.totalUnplannedDowntimeHours,
            }
          : null,
      },
    };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard KPIs",
    };
  }
}

// ─── Daily efficiency trend ─────────────────────────────────────────

export async function getDailyEfficiencyTrend(
  dateFrom: string,
  dateTo: string,
  lineIds?: number[],
) {
  try {
    await requireGrant({
      capability: "dashboard.read",
      scope: { dim: null },
      actionName: "getDailyEfficiencyTrend",
    });

    const conditions = [gte(productionRuns.date, dateFrom), lte(productionRuns.date, dateTo)];

    if (lineIds && lineIds.length > 0) {
      conditions.push(inArray(productionRuns.lineId, lineIds));
    }

    const rows = await db
      .select({
        date: productionRuns.date,
        actualOutput: productionRuns.actualOutput,
        totalHours: productionRuns.totalHours,
        plannedStopHours: productionRuns.plannedStopHours,
        nominalSpeed: products.nominalSpeed,
      })
      .from(productionRuns)
      .leftJoin(products, eq(productionRuns.productId, products.id))
      .where(and(...conditions))
      .orderBy(asc(productionRuns.date));

    // Group by date
    const byDate = new Map<
      string,
      {
        actualOutput: number;
        totalHours: number;
        plannedStopHours: number | null;
        nominalSpeed: number | null;
      }[]
    >();

    for (const row of rows) {
      const existing = byDate.get(row.date) ?? [];
      existing.push(row);
      byDate.set(row.date, existing);
    }

    const trend = Array.from(byDate.entries()).map(([date, dateRows]) => {
      const agg = computeAggregates(dateRows);
      return {
        date,
        productivity: agg.productivity,
        efficiency: agg.efficiency,
      };
    });

    return { success: true as const, data: trend };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch efficiency trend",
    };
  }
}

// ─── Production by product ──────────────────────────────────────────

export async function getProductionByProduct(
  dateFrom?: string,
  dateTo?: string,
  lineIds?: number[],
) {
  try {
    await requireGrant({
      capability: "dashboard.read",
      scope: { dim: null },
      actionName: "getProductionByProduct",
    });

    const filters: DashboardFilters = { dateFrom, dateTo, lineIds };
    const where = buildRunConditions(filters);

    const rows = await db
      .select({
        productName: products.name,
        totalOutput: sql<number>`sum(${productionRuns.actualOutput})`.as("total_output"),
      })
      .from(productionRuns)
      .leftJoin(products, eq(productionRuns.productId, products.id))
      .where(where)
      .groupBy(productionRuns.productId)
      .orderBy(sql`sum(${productionRuns.actualOutput}) desc`);

    return { success: true as const, data: rows };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch production by product",
    };
  }
}

// ─── Line comparison ────────────────────────────────────────────────

export async function getLineComparison(dateFrom?: string, dateTo?: string) {
  try {
    await requireGrant({
      capability: "dashboard.read",
      scope: { dim: null },
      actionName: "getLineComparison",
    });

    const conditions = [];
    if (dateFrom) conditions.push(gte(productionRuns.date, dateFrom));
    if (dateTo) conditions.push(lte(productionRuns.date, dateTo));

    const rows = await db
      .select({
        lineId: productionRuns.lineId,
        lineName: productionLines.name,
        actualOutput: productionRuns.actualOutput,
        totalHours: productionRuns.totalHours,
        plannedStopHours: productionRuns.plannedStopHours,
        nominalSpeed: products.nominalSpeed,
      })
      .from(productionRuns)
      .leftJoin(products, eq(productionRuns.productId, products.id))
      .leftJoin(productionLines, eq(productionRuns.lineId, productionLines.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Group by line
    const byLine = new Map<
      number,
      {
        lineName: string | null;
        rows: {
          actualOutput: number;
          totalHours: number;
          plannedStopHours: number | null;
          nominalSpeed: number | null;
        }[];
      }
    >();

    for (const row of rows) {
      const lineId = row.lineId ?? 0;
      const existing = byLine.get(lineId) ?? {
        lineName: row.lineName,
        rows: [],
      };
      existing.rows.push(row);
      byLine.set(lineId, existing);
    }

    const result = Array.from(byLine.values()).map(({ lineName, rows: lineRows }) => {
      const agg = computeAggregates(lineRows);
      return {
        lineName: lineName ?? "Unknown",
        efficiency: agg.efficiency,
        productivity: agg.productivity,
      };
    });

    // Sort by line name for consistent ordering
    result.sort((a, b) => a.lineName.localeCompare(b.lineName));

    return { success: true as const, data: result };
  } catch (error) {
    const perm = toActionError(error);
    if (perm) return perm;
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch line comparison",
    };
  }
}
