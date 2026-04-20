/**
 * OEE calculation helpers.
 *
 * All derived metrics are computed in the app layer — they are NOT stored in the database.
 *
 * Formulas:
 *   net_work_hours      = actual_output / nominal_speed
 *   planned_work_hours   = total_hours - planned_stop_hours
 *   unplanned_stop_hours = planned_work_hours - net_work_hours  (clamped to >= 0)
 *   productivity         = net_work_hours / planned_work_hours
 *   efficiency           = net_work_hours / total_hours
 */

export interface RunMetricsInput {
  actualOutput: number;
  totalHours: number;
  plannedStopHours: number;
  nominalSpeed: number;
}

export interface RunMetrics {
  netWorkHours: number;
  plannedWorkHours: number;
  unplannedStopHours: number;
  productivity: number;
  efficiency: number;
}

export function calculateRunMetrics(run: RunMetricsInput): RunMetrics {
  const netWorkHours = run.nominalSpeed > 0 ? run.actualOutput / run.nominalSpeed : 0;
  const plannedWorkHours = run.totalHours - run.plannedStopHours;
  const unplannedStopHours = Math.max(0, plannedWorkHours - netWorkHours);
  const productivity = plannedWorkHours > 0 ? netWorkHours / plannedWorkHours : 0;
  const efficiency = run.totalHours > 0 ? netWorkHours / run.totalHours : 0;

  return {
    netWorkHours,
    plannedWorkHours,
    unplannedStopHours,
    productivity,
    efficiency,
  };
}
