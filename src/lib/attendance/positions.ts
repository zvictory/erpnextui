"use client";
import { useMemo } from "react";
import { getDataset } from "./data";
import {
  DEFAULT_POSITION_SALARY_UZS,
  useSalaries,
  getSalariesSnapshot,
} from "@/stores/attendance/positions-store";

export interface PositionInfo {
  label: string;
  count: number;
  salaryUZS: number;
  isCustom: boolean;
}

export function listPositionLabels(): string[] {
  const set = new Set<string>();
  for (const e of getDataset().employees) if (e.position) set.add(e.position);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getPositionSalary(label: string): number {
  return getSalariesSnapshot()[label] ?? DEFAULT_POSITION_SALARY_UZS;
}

export function usePositions(): PositionInfo[] {
  const salaries = useSalaries();
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of getDataset().employees) {
      if (!e.position) continue;
      counts.set(e.position, (counts.get(e.position) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({
        label,
        count,
        salaryUZS: salaries[label] ?? DEFAULT_POSITION_SALARY_UZS,
        isCustom: salaries[label] !== undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [salaries]);
}

export function usePositionSalary(label: string | null | undefined): number {
  const salaries = useSalaries();
  if (!label) return DEFAULT_POSITION_SALARY_UZS;
  return salaries[label] ?? DEFAULT_POSITION_SALARY_UZS;
}
