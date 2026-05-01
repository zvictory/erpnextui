"use client";
import { useMemo } from "react";
import raw from "@/data/attendance-demo.json";
import {
  computeDay,
  type ShiftKind,
  type DayResult,
  type Policy,
  type Region,
} from "./state-machine";
import {
  useOverrides,
  defaultStajForId,
  defaultRegionForId,
  type EmployeeOverride,
} from "@/stores/attendance/employee-overrides-store";
import { usePolicy } from "@/stores/attendance/policy-store";

export interface DayPunch {
  d: number;
  in: string | null;
  out: string | null;
  lateMin: number;
  earlyMin: number;
  extraMin: number;
  worked: string;
}

export interface RawEmployee {
  id: string;
  name: string;
  dept: string;
  position: string;
  days: DayPunch[];
}

export interface Employee extends RawEmployee {
  shift: ShiftKind;
  stajYears: number;
  overtimeMin: number;
  region: Region;
  hireDate: string | null;
  terminationDate: string | null;
}

interface Dataset {
  year: number;
  month: number;
  days: number;
  employees: RawEmployee[];
}

const DATA = raw as Dataset;

const DAY_KEYWORDS = [
  "ishlab chiqarish",
  "operator",
  "mexanik",
  "haydovchi",
  "yuk",
  "qadoq",
  "склад",
  "ишлаб",
  "произ",
  "цех",
  "наладчик",
];
const NIGHT_KEYWORDS = ["tungi", "ноч"];
const OFFICE_KEYWORDS = [
  "buxgalter",
  "buhgalter",
  "хисобчи",
  "xisobchi",
  "hisobchi",
  "menejer",
  "директор",
  "direktor",
  "kotib",
  "юрист",
  "yurist",
  "marketing",
  "savdo",
  "продаж",
  "snab",
  "снаб",
  "kadrlar",
  "hr",
  "it",
];
const LIGHT_KEYWORDS = ["nazoratchi", "контролёр", "qorovul", "охран"];

export function inferShift(dept: string, position: string): ShiftKind {
  const hay = `${dept} ${position}`.toLowerCase();
  if (NIGHT_KEYWORDS.some((k) => hay.includes(k))) return "night";
  if (OFFICE_KEYWORDS.some((k) => hay.includes(k))) return "office";
  if (LIGHT_KEYWORDS.some((k) => hay.includes(k))) return "light";
  if (DAY_KEYWORDS.some((k) => hay.includes(k))) return "day";
  return "office";
}

export function getDataset() {
  return DATA;
}

function applyOverride(raw: RawEmployee, override: EmployeeOverride | undefined): Employee {
  const name = override?.name ?? raw.name;
  const dept = override?.dept ?? raw.dept;
  const position = override?.position ?? raw.position;
  const shift = override?.shift ?? inferShift(dept, position);
  const stajYears = override?.stajYears ?? defaultStajForId(raw.id);
  const overtimeMin = override?.overtimeMin ?? 0;
  const region = override?.region ?? defaultRegionForId(raw.id);
  const hireDate = override?.hireDate ?? null;
  const terminationDate = override?.terminationDate ?? null;

  const days = raw.days.map((d) => {
    const patch = override?.days?.[d.d];
    if (!patch) return d;
    const inV = patch.in !== undefined ? patch.in : d.in;
    const outV = patch.out !== undefined ? patch.out : d.out;
    const extraMin = patch.extraMin !== undefined ? patch.extraMin : d.extraMin;
    return { ...d, in: inV, out: outV, extraMin };
  });

  return {
    id: raw.id,
    name,
    dept,
    position,
    days,
    shift,
    stajYears,
    overtimeMin,
    region,
    hireDate,
    terminationDate,
  };
}

// Returns the employment-state code for a given day number within the dataset month,
// based on hire/termination dates. null = day is within active employment (use normal status).
export function employmentMarker(
  emp: Pick<Employee, "hireDate" | "terminationDate">,
  year: number,
  month: number,
  day: number,
): "hire" | "termination" | "before" | "after" | null {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (emp.hireDate) {
    if (iso === emp.hireDate) return "hire";
    if (iso < emp.hireDate) return "before";
  }
  if (emp.terminationDate) {
    if (iso === emp.terminationDate) return "termination";
    if (iso > emp.terminationDate) return "after";
  }
  return null;
}

export function useEmployees(): Employee[] {
  const overrides = useOverrides();
  return useMemo(
    () => DATA.employees.map((e) => applyOverride(e, overrides[e.id])),
    [overrides],
  );
}

export function useEmployee(id: string): Employee | null {
  const overrides = useOverrides();
  return useMemo(() => {
    const r = DATA.employees.find((e) => e.id === id);
    return r ? applyOverride(r, overrides[id]) : null;
  }, [id, overrides]);
}

export interface MonthlyStats {
  workedMinutes: number;
  lateIncidents: number;
  lateMinutes: number;
  feeUZS: number;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  incompleteDays: number;
  perDay: { day: DayPunch; result: DayResult }[];
}

export function computeMonth(emp: Employee, policy: Policy): MonthlyStats {
  let workedMinutes = 0;
  let lateIncidents = 0;
  let lateMinutes = 0;
  let feeUZS = 0;
  let fullDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let incompleteDays = 0;
  const perDay: MonthlyStats["perDay"] = [];

  for (const day of emp.days) {
    const r = computeDay({ arrival: day.in, departure: day.out, shift: emp.shift }, policy);
    workedMinutes += r.workedMin;
    if (r.status === "late_flat" || r.status === "late_step") {
      lateIncidents += 1;
      lateMinutes += r.lateMin;
    }
    feeUZS += r.feeUZS;
    if (r.status === "present" || r.status === "late_flat" || r.status === "late_step")
      fullDays += 1;
    if (r.status === "half_day") halfDays += 1;
    if (r.status === "absent") absentDays += 1;
    if (r.status === "incomplete") incompleteDays += 1;
    perDay.push({ day, result: r });
  }

  return {
    workedMinutes,
    lateIncidents,
    lateMinutes,
    feeUZS,
    fullDays,
    halfDays,
    absentDays,
    incompleteDays,
    perDay,
  };
}

export function useMonth(emp: Employee | null): MonthlyStats | null {
  const policy = usePolicy();
  return useMemo(() => (emp ? computeMonth(emp, policy) : null), [emp, policy]);
}

export function getDepartments(): string[] {
  const set = new Set<string>();
  for (const e of DATA.employees) if (e.dept) set.add(e.dept);
  return Array.from(set).sort();
}

export function getPositions(): string[] {
  const set = new Set<string>();
  for (const e of DATA.employees) if (e.position) set.add(e.position);
  return Array.from(set).sort();
}
