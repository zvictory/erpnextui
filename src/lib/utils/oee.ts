import type { OEEResult, OEERating } from "@/types/asset";

interface OEEInput {
  plannedProductionTimeHours: number;
  downtimeHours: number;
  actualQty: number;
  capacityPerHour: number;
  goodQty: number;
  totalQty: number;
}

/**
 * Calculate OEE (Overall Equipment Effectiveness).
 *
 * Availability = (Planned - Downtime) / Planned × 100
 * Performance  = Actual / (Capacity × RunTime) × 100
 * Quality      = Good / Total × 100
 * OEE          = A × P × Q / 10000
 */
export function calculateOEE(input: OEEInput): OEEResult {
  const { plannedProductionTimeHours, downtimeHours, actualQty, capacityPerHour, goodQty, totalQty } =
    input;

  // Availability
  const runTime = plannedProductionTimeHours - downtimeHours;
  const availability =
    plannedProductionTimeHours > 0 ? (runTime / plannedProductionTimeHours) * 100 : 0;

  // Performance
  const maxOutput = capacityPerHour * runTime;
  const performance = maxOutput > 0 ? (actualQty / maxOutput) * 100 : 0;

  // Quality
  const quality = totalQty > 0 ? (goodQty / totalQty) * 100 : 0;

  // OEE
  const oee = (availability * performance * quality) / 10000;

  return {
    availability: clamp(availability),
    performance: clamp(performance),
    quality: clamp(quality),
    oee: clamp(oee),
  };
}

/**
 * Rate OEE value.
 * World class: 85%+, Good: 70-85%, Average: 50-70%, Low: <50%
 */
export function rateOEE(oeePct: number): OEERating {
  if (oeePct >= 85) return "world_class";
  if (oeePct >= 70) return "good";
  if (oeePct >= 50) return "average";
  return "low";
}

/** OEE rating colors for UI badges. */
export function oeeColor(rating: OEERating): string {
  switch (rating) {
    case "world_class":
      return "text-emerald-600 bg-emerald-50";
    case "good":
      return "text-blue-600 bg-blue-50";
    case "average":
      return "text-amber-600 bg-amber-50";
    case "low":
      return "text-red-600 bg-red-50";
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}
