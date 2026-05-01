"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";

export const DEFAULT_POSITION_SALARY_UZS = 4_500_000;

interface PositionsState {
  salaries: Record<string, number>;
  setPositionSalary: (label: string, value: number) => void;
  resetPosition: (label: string) => void;
  resetAll: () => void;
}

export const usePositionsStore = create<PositionsState>()(
  persist(
    (set) => ({
      salaries: {},
      setPositionSalary: (label, value) =>
        set((s) => ({ salaries: { ...s.salaries, [label]: value } })),
      resetPosition: (label) =>
        set((s) => {
          const next = { ...s.salaries };
          delete next[label];
          return { salaries: next };
        }),
      resetAll: () => set({ salaries: {} }),
    }),
    { name: "attendance-positions", version: 1 },
  ),
);

export function getSalariesSnapshot(): Record<string, number> {
  return usePositionsStore.getState().salaries;
}

export function useSalaries(): Record<string, number> {
  return usePositionsStore(useShallow((s) => s.salaries));
}
