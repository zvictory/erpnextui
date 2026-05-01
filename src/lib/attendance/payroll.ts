// Payroll model: position salary + staj bonus + overtime coefficient.
// +10% night premium applies ONLY to overtime hours (per team decision), not to the base shift.

import type { StajTier } from "./state-machine";

export function stajBonusPct(years: number, tiers: StajTier[]): number {
  let pct = 0;
  for (const t of tiers) if (years >= t.minYears) pct = t.pct;
  return pct;
}

export interface PayrollInput {
  basePositionSalaryUZS: number;
  stajYears: number;
  daysWorked: number;
  halfDays: number;
  scheduledDays: number;
  overtimeMinutes: number;
  overtimeCoefficient: number;
  isNightOT: boolean;
  hourlyRateUZS: number;
  feesUZS: number;
  stajTiers: StajTier[];
  transportRateUZS: number;
  transportDays: number;
}

export function computePayroll(p: PayrollInput) {
  const stajPct = stajBonusPct(p.stajYears, p.stajTiers);
  const baseWithStaj = p.basePositionSalaryUZS * (1 + stajPct);

  const attendanceFactor =
    p.scheduledDays > 0 ? (p.daysWorked + p.halfDays * 0.5) / p.scheduledDays : 0;
  const earnedSalary = baseWithStaj * attendanceFactor;

  const otHours = p.overtimeMinutes / 60;
  const otBase = otHours * p.hourlyRateUZS * p.overtimeCoefficient;
  const otTotal = p.isNightOT ? otBase * 1.1 : otBase;

  const transportUZS = p.transportRateUZS * p.transportDays;

  const gross = earnedSalary + otTotal + transportUZS;
  const net = Math.max(0, gross - p.feesUZS);

  return {
    stajPct,
    baseWithStaj,
    attendanceFactor,
    earnedSalary,
    overtimeUZS: otTotal,
    transportUZS,
    feesUZS: p.feesUZS,
    gross,
    net,
  };
}
