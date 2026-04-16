import { differenceInHours } from "date-fns";
import type { MaintenanceLog } from "@/types/maintenance";
import type { MTBFMTTRResult } from "@/types/maintenance";

/**
 * MTBF — Mean Time Between Failures (hours).
 * Only considers "corrective" maintenance logs (actual breakdowns).
 * Needs at least 2 corrective events to calculate intervals.
 */
export function calculateMTBF(logs: MaintenanceLog[]): number {
  const corrective = logs
    .filter((l) => l.maintenanceType === "corrective")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (corrective.length < 2) return 0;

  let totalHours = 0;
  for (let i = 1; i < corrective.length; i++) {
    totalHours += differenceInHours(new Date(corrective[i].date), new Date(corrective[i - 1].date));
  }

  return totalHours / (corrective.length - 1);
}

/**
 * MTTR — Mean Time To Repair (hours).
 * Average duration of corrective maintenance events.
 */
export function calculateMTTR(logs: MaintenanceLog[]): number {
  const corrective = logs.filter((l) => l.maintenanceType === "corrective");
  if (corrective.length === 0) return 0;

  const totalRepairHours = corrective.reduce((sum, l) => sum + l.durationHours, 0);
  return totalRepairHours / corrective.length;
}

/**
 * Combined MTBF + MTTR result.
 */
export function calculateMTBFMTTR(logs: MaintenanceLog[]): MTBFMTTRResult {
  return {
    mtbf: calculateMTBF(logs),
    mttr: calculateMTTR(logs),
  };
}

/**
 * Availability from MTBF/MTTR: MTBF / (MTBF + MTTR) × 100.
 * Returns 100 if no failures recorded.
 */
export function availabilityFromMTBF(result: MTBFMTTRResult): number {
  if (result.mtbf <= 0) return 100;
  return (result.mtbf / (result.mtbf + result.mttr)) * 100;
}
