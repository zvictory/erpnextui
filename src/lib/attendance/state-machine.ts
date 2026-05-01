// Attendance status state machine — encodes the team's decisions.
//
// Decisions (see presentation/attendance-plan.html for the team-facing version):
//   - Late grace: 10 minutes (<= 8:10 day, <= 20:10 night)
//   - 11-20 min late -> flat 15 000 UZS
//   - 21-179 min late -> 15 000 + 5 000 per 10-min block, capped at DAILY_CAP
//   - Half-day: arrival on/after fixed anchor (11:00 day / 23:00 night) AND >= 6h worked
//   - Otherwise -> incomplete
//   - DAILY_CAP = 50 000 UZS (working value, pending final confirmation)

export type ShiftKind = "day" | "night" | "office" | "light" | "flexible" | "remote";

// Transport allowance tiers — paid per worked day based on where the employee lives.
export type Region = "city" | "district" | "farDistrict";
export const REGIONS: Region[] = ["city", "district", "farDistrict"];

export interface ShiftDef {
  startH: number;
  startM: number;
  endH: number;
  lengthMin: number;
  halfDayAnchorH: number;
}

export interface StajTier {
  minYears: number;
  pct: number;
}

export interface Policy {
  dailyCapUZS: number;
  flatFeeUZS: number;
  stepFeeUZS: number;
  graceMin: number;
  halfDayMinMin: number;
  shifts: Record<ShiftKind, ShiftDef>;
  stajTiers: StajTier[];
  regionRatesUZS: Record<Region, number>;
  feeBudgetUZS: number;
}

export const DEFAULT_POLICY: Policy = {
  dailyCapUZS: 50_000,
  flatFeeUZS: 15_000,
  stepFeeUZS: 5_000,
  graceMin: 10,
  halfDayMinMin: 6 * 60,
  shifts: {
    day: { startH: 8, startM: 0, endH: 20, lengthMin: 12 * 60, halfDayAnchorH: 11 },
    night: { startH: 20, startM: 0, endH: 8, lengthMin: 12 * 60, halfDayAnchorH: 23 },
    office: { startH: 9, startM: 0, endH: 18, lengthMin: 8 * 60, halfDayAnchorH: 12 },
    light: { startH: 9, startM: 0, endH: 14, lengthMin: 5 * 60, halfDayAnchorH: 12 },
    flexible: { startH: 9, startM: 0, endH: 18, lengthMin: 8 * 60, halfDayAnchorH: 13 },
    remote: { startH: 9, startM: 0, endH: 18, lengthMin: 8 * 60, halfDayAnchorH: 13 },
  },
  stajTiers: [
    { minYears: 1, pct: 0.1 },
    { minYears: 4, pct: 0.2 },
    { minYears: 6, pct: 0.3 },
    { minYears: 11, pct: 0.5 },
  ],
  regionRatesUZS: {
    city: 10_000,
    district: 15_000,
    farDistrict: 20_000,
  },
  feeBudgetUZS: 5_000_000,
};

export type DayStatus =
  | "present"
  | "late_flat"
  | "late_step"
  | "half_day"
  | "absent"
  | "incomplete"
  | "weekend"
  | "holiday";

export interface DayResult {
  status: DayStatus;
  lateMin: number;
  workedMin: number;
  feeUZS: number;
  wagePct: number;
}

export function parseHHMM(s: string | null | undefined): { h: number; m: number } | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const mn = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mn)) return null;
  return { h, m: mn };
}

export function workedMinutes(inHHMM: string | null, outHHMM: string | null): number {
  const a = parseHHMM(inHHMM);
  const b = parseHHMM(outHHMM);
  if (!a || !b) return 0;
  const start = a.h * 60 + a.m;
  let end = b.h * 60 + b.m;
  if (end < start) end += 24 * 60;
  return Math.max(0, end - start);
}

export function lateMinutes(arrivalHHMM: string | null, shift: ShiftKind, policy: Policy): number {
  const a = parseHHMM(arrivalHHMM);
  if (!a) return 0;
  const def = policy.shifts[shift];
  const arrivalMin = a.h * 60 + a.m;
  const expectedMin = def.startH * 60 + def.startM;
  return Math.max(0, arrivalMin - expectedMin);
}

export function isCrossMidnight(arrival: string | null, departure: string | null): boolean {
  const a = parseHHMM(arrival);
  const b = parseHHMM(departure);
  if (!a || !b) return false;
  return b.h * 60 + b.m < a.h * 60 + a.m;
}

export function computeDay(
  opts: {
    arrival: string | null;
    departure: string | null;
    shift: ShiftKind;
  },
  policy: Policy,
): DayResult {
  const { arrival, departure, shift } = opts;

  if (!arrival && !departure) {
    return { status: "absent", lateMin: 0, workedMin: 0, feeUZS: 0, wagePct: 0 };
  }
  if (!arrival || !departure) {
    return { status: "incomplete", lateMin: 0, workedMin: 0, feeUZS: 0, wagePct: 0 };
  }

  // Cross-midnight punches are unambiguously a night shift that day, regardless
  // of the employee's nominal shift assignment.
  const effectiveShift: ShiftKind = isCrossMidnight(arrival, departure) ? "night" : shift;

  const lm = lateMinutes(arrival, effectiveShift, policy);
  const wm = workedMinutes(arrival, departure);
  const def = policy.shifts[effectiveShift];
  const a = parseHHMM(arrival)!;

  if (a.h >= def.halfDayAnchorH) {
    if (wm >= policy.halfDayMinMin) {
      return { status: "half_day", lateMin: lm, workedMin: wm, feeUZS: 0, wagePct: 0.5 };
    }
    return { status: "incomplete", lateMin: lm, workedMin: wm, feeUZS: 0, wagePct: 0 };
  }

  if (lm <= policy.graceMin) {
    return { status: "present", lateMin: lm, workedMin: wm, feeUZS: 0, wagePct: 1 };
  }
  if (lm <= policy.graceMin + 10) {
    return {
      status: "late_flat",
      lateMin: lm,
      workedMin: wm,
      feeUZS: policy.flatFeeUZS,
      wagePct: 1,
    };
  }
  const blocksPast = Math.ceil((lm - (policy.graceMin + 10)) / 10);
  const fee = Math.min(policy.flatFeeUZS + blocksPast * policy.stepFeeUZS, policy.dailyCapUZS);
  return { status: "late_step", lateMin: lm, workedMin: wm, feeUZS: fee, wagePct: 1 };
}

export const STATUS_META: Record<DayStatus, { color: string; bg: string; icon: string }> = {
  present: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30",
    icon: "✓",
  },
  late_flat: {
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30",
    icon: "⚠",
  },
  late_step: {
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-500/15 dark:border-orange-500/40",
    icon: "⏱",
  },
  half_day: {
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30",
    icon: "◐",
  },
  absent: {
    color: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-100 border-zinc-200 dark:bg-zinc-500/10 dark:border-zinc-500/30",
    icon: "✗",
  },
  incomplete: {
    color: "text-fuchsia-700 dark:text-fuchsia-300",
    bg: "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:border-fuchsia-500/30",
    icon: "…",
  },
  weekend: {
    color: "text-zinc-500 dark:text-zinc-500",
    bg: "bg-zinc-50 border-zinc-200 dark:bg-zinc-800/40 dark:border-zinc-700/50",
    icon: "·",
  },
  holiday: {
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30",
    icon: "★",
  },
};
