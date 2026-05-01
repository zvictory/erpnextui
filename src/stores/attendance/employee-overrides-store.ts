"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import type { ShiftKind, Region } from "@/lib/attendance/state-machine";
import { REGIONS } from "@/lib/attendance/state-machine";

export interface DayPunchPatch {
  in?: string | null;
  out?: string | null;
  extraMin?: number;
}

export interface EmployeeOverride {
  name?: string;
  dept?: string;
  position?: string;
  shift?: ShiftKind;
  stajYears?: number;
  overtimeMin?: number;
  region?: Region;
  hireDate?: string | null;
  terminationDate?: string | null;
  days?: Record<number, DayPunchPatch>;
}

interface EmployeeState {
  overrides: Record<string, EmployeeOverride>;
  setEmployeeField: (id: string, patch: Omit<EmployeeOverride, "days">) => void;
  setDayPunch: (id: string, day: number, patch: DayPunchPatch) => void;
  resetEmployee: (id: string) => void;
  resetEmployeeDay: (id: string, day: number) => void;
  resetAll: () => void;
}

export const useEmployeeStore = create<EmployeeState>()(
  persist(
    (set) => ({
      overrides: {},
      setEmployeeField: (id, patch) =>
        set((s) => ({
          overrides: {
            ...s.overrides,
            [id]: { ...s.overrides[id], ...patch },
          },
        })),
      setDayPunch: (id, day, patch) =>
        set((s) => {
          const existing = s.overrides[id] ?? {};
          const days = { ...(existing.days ?? {}) };
          days[day] = { ...(days[day] ?? {}), ...patch };
          return {
            overrides: {
              ...s.overrides,
              [id]: { ...existing, days },
            },
          };
        }),
      resetEmployee: (id) =>
        set((s) => {
          const next = { ...s.overrides };
          delete next[id];
          return { overrides: next };
        }),
      resetEmployeeDay: (id, day) =>
        set((s) => {
          const existing = s.overrides[id];
          if (!existing?.days) return s;
          const days = { ...existing.days };
          delete days[day];
          return {
            overrides: {
              ...s.overrides,
              [id]: { ...existing, days },
            },
          };
        }),
      resetAll: () => set({ overrides: {} }),
    }),
    {
      name: "attendance-employees",
      version: 1,
    },
  ),
);

export function getOverridesSnapshot(): Record<string, EmployeeOverride> {
  return useEmployeeStore.getState().overrides;
}

export function useOverrides(): Record<string, EmployeeOverride> {
  return useEmployeeStore(useShallow((s) => s.overrides));
}

// Deterministic 0–14 staj seed from id hash so the demo shows realistic spread immediately.
export function defaultStajForId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 15;
}

// Deterministic region seed: ~60% city, 30% district, 10% far. Different prime so it
// doesn't correlate with staj.
export function defaultRegionForId(id: string): Region {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 37 + id.charCodeAt(i)) | 0;
  const bucket = Math.abs(h) % 10;
  if (bucket < 6) return REGIONS[0];
  if (bucket < 9) return REGIONS[1];
  return REGIONS[2];
}
