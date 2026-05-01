import { computeMonth, getDataset, type Employee } from "./data";
import { parseHHMM, type Policy, type ShiftKind } from "./state-machine";
import { inferGender, type Gender } from "./gender";

export interface AbsenceByDayPoint {
  day: number;
  dow: number;
  scheduled: number;
  absent: number;
  rate: number;
}

export function absenceByDay(employees: Employee[], policy: Policy): AbsenceByDayPoint[] {
  const ds = getDataset();
  const points: AbsenceByDayPoint[] = [];
  const months = computeAll(employees, policy);
  for (let d = 1; d <= ds.days; d += 1) {
    const dow = new Date(Date.UTC(ds.year, ds.month - 1, d)).getUTCDay();
    let absent = 0;
    let scheduled = 0;
    for (const m of months) {
      const r = m.perDay.find((p) => p.day.d === d);
      if (!r) continue;
      scheduled += 1;
      if (r.result.status === "absent" || r.result.status === "incomplete") {
        absent += 1;
      }
    }
    points.push({
      day: d,
      dow,
      scheduled,
      absent,
      rate: scheduled > 0 ? absent / scheduled : 0,
    });
  }
  return points;
}

export interface ArrivalBin {
  bucketMin: number;
  label: string;
  count: number;
  late: number;
}

const BIN_SIZE = 10;

export function arrivalBins(
  employees: Employee[],
  shift: ShiftKind,
  policy: Policy,
): ArrivalBin[] {
  const def = policy.shifts[shift];
  const expected = def.startH * 60 + def.startM;
  const fromMin = expected - 60;
  const toMin = expected + 180;
  const bins: ArrivalBin[] = [];
  for (let m = fromMin; m < toMin; m += BIN_SIZE) {
    const h = ((Math.floor(m / 60) % 24) + 24) % 24;
    const mm = ((m % 60) + 60) % 60;
    bins.push({
      bucketMin: m,
      label: `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      count: 0,
      late: 0,
    });
  }
  for (const e of employees) {
    if (e.shift !== shift) continue;
    for (const day of e.days) {
      const a = parseHHMM(day.in);
      if (!a) continue;
      const arr = a.h * 60 + a.m;
      const idx = Math.floor((arr - fromMin) / BIN_SIZE);
      if (idx < 0 || idx >= bins.length) continue;
      bins[idx].count += 1;
      if (arr - expected > policy.graceMin) bins[idx].late += 1;
    }
  }
  return bins;
}

export interface GenderShiftCell {
  gender: Gender;
  shift: ShiftKind;
  count: number;
}

const SHIFTS: ShiftKind[] = ["day", "night", "office", "light", "flexible", "remote"];

export function genderShiftMatrix(employees: Employee[]): GenderShiftCell[] {
  const cells: GenderShiftCell[] = [];
  for (const g of ["m", "f"] as const) {
    for (const s of SHIFTS) {
      const count = employees.filter(
        (e) => inferGender(e.name) === g && e.shift === s,
      ).length;
      cells.push({ gender: g, shift: s, count });
    }
  }
  return cells;
}

export interface RegionTotal {
  region: "city" | "district" | "farDistrict";
  workedDayEquivalents: number;
  uzs: number;
  employees: number;
}

export function regionTransport(employees: Employee[], policy: Policy): RegionTotal[] {
  const months = computeAll(employees, policy);
  const out: RegionTotal[] = [
    { region: "city", workedDayEquivalents: 0, uzs: 0, employees: 0 },
    { region: "district", workedDayEquivalents: 0, uzs: 0, employees: 0 },
    { region: "farDistrict", workedDayEquivalents: 0, uzs: 0, employees: 0 },
  ];
  employees.forEach((e, i) => {
    const slot = out.find((r) => r.region === e.region)!;
    slot.employees += 1;
    const m = months[i];
    const dayEq = m.fullDays + 0.5 * m.halfDays;
    slot.workedDayEquivalents += dayEq;
    slot.uzs += dayEq * policy.regionRatesUZS[e.region];
  });
  return out;
}

export interface StatusMixSlice {
  key: "present" | "late_flat" | "late_step" | "half_day" | "absent" | "incomplete";
  count: number;
}

export function statusMix(employees: Employee[], policy: Policy): StatusMixSlice[] {
  const months = computeAll(employees, policy);
  const counts: Record<StatusMixSlice["key"], number> = {
    present: 0,
    late_flat: 0,
    late_step: 0,
    half_day: 0,
    absent: 0,
    incomplete: 0,
  };
  for (const m of months) {
    for (const p of m.perDay) {
      const s = p.result.status;
      if (s in counts) counts[s as StatusMixSlice["key"]] += 1;
    }
  }
  return (
    ["present", "late_flat", "late_step", "half_day", "absent", "incomplete"] as const
  ).map((k) => ({ key: k, count: counts[k] }));
}

export interface DailySeriesPoint {
  day: number;
  dow: number;
  hours: number;
  fee: number;
  present: number;
  absent: number;
}

export function dailySeries(employees: Employee[], policy: Policy): DailySeriesPoint[] {
  const ds = getDataset();
  const months = computeAll(employees, policy);
  const points: DailySeriesPoint[] = [];
  for (let d = 1; d <= ds.days; d += 1) {
    const dow = new Date(Date.UTC(ds.year, ds.month - 1, d)).getUTCDay();
    let mins = 0;
    let fee = 0;
    let present = 0;
    let absent = 0;
    for (const m of months) {
      const r = m.perDay.find((p) => p.day.d === d);
      if (!r) continue;
      mins += r.result.workedMin;
      fee += r.result.feeUZS;
      if (
        r.result.status === "present" ||
        r.result.status === "late_flat" ||
        r.result.status === "late_step" ||
        r.result.status === "half_day"
      ) {
        present += 1;
      } else if (r.result.status === "absent") {
        absent += 1;
      }
    }
    points.push({ day: d, dow, hours: mins / 60, fee, present, absent });
  }
  return points;
}

function computeAll(employees: Employee[], policy: Policy) {
  return employees.map((e) => computeMonth(e, policy));
}
