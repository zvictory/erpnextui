"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import {
  DEFAULT_POLICY,
  type Policy,
  type Region,
  type ShiftDef,
  type ShiftKind,
  type StajTier,
} from "@/lib/attendance/state-machine";

interface PolicyState extends Policy {
  setNumber: (
    key: "dailyCapUZS" | "flatFeeUZS" | "stepFeeUZS" | "graceMin" | "halfDayMinMin" | "feeBudgetUZS",
    value: number,
  ) => void;
  setShiftField: (kind: ShiftKind, patch: Partial<ShiftDef>) => void;
  setStajTier: (index: number, patch: Partial<StajTier>) => void;
  addStajTier: () => void;
  removeStajTier: (index: number) => void;
  setRegionRate: (region: Region, value: number) => void;
  resetPolicy: () => void;
}

export const usePolicyStore = create<PolicyState>()(
  persist(
    (set) => ({
      ...DEFAULT_POLICY,
      setNumber: (key, value) => set({ [key]: value } as Pick<PolicyState, typeof key>),
      setShiftField: (kind, patch) =>
        set((s) => ({
          shifts: { ...s.shifts, [kind]: { ...s.shifts[kind], ...patch } },
        })),
      setStajTier: (index, patch) =>
        set((s) => ({
          stajTiers: s.stajTiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
        })),
      addStajTier: () =>
        set((s) => {
          const last = s.stajTiers[s.stajTiers.length - 1];
          const next: StajTier = {
            minYears: last ? last.minYears + 5 : 1,
            pct: last ? Math.min(last.pct + 0.1, 1) : 0.1,
          };
          return { stajTiers: [...s.stajTiers, next] };
        }),
      removeStajTier: (index) =>
        set((s) => ({ stajTiers: s.stajTiers.filter((_, i) => i !== index) })),
      setRegionRate: (region, value) =>
        set((s) => ({ regionRatesUZS: { ...s.regionRatesUZS, [region]: value } })),
      resetPolicy: () => set({ ...DEFAULT_POLICY }),
    }),
    {
      name: "attendance-policy",
      version: 3,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (!p.regionRatesUZS) p.regionRatesUZS = DEFAULT_POLICY.regionRatesUZS;
        if (typeof p.feeBudgetUZS !== "number") p.feeBudgetUZS = DEFAULT_POLICY.feeBudgetUZS;
        return p as unknown as PolicyState;
      },
    },
  ),
);

export function getPolicySnapshot(): Policy {
  const s = usePolicyStore.getState();
  return {
    dailyCapUZS: s.dailyCapUZS,
    flatFeeUZS: s.flatFeeUZS,
    stepFeeUZS: s.stepFeeUZS,
    graceMin: s.graceMin,
    halfDayMinMin: s.halfDayMinMin,
    shifts: s.shifts,
    stajTiers: s.stajTiers,
    regionRatesUZS: s.regionRatesUZS,
    feeBudgetUZS: s.feeBudgetUZS,
  };
}

export function usePolicy(): Policy {
  return usePolicyStore(
    useShallow((s) => ({
      dailyCapUZS: s.dailyCapUZS,
      flatFeeUZS: s.flatFeeUZS,
      stepFeeUZS: s.stepFeeUZS,
      graceMin: s.graceMin,
      halfDayMinMin: s.halfDayMinMin,
      shifts: s.shifts,
      stajTiers: s.stajTiers,
      regionRatesUZS: s.regionRatesUZS,
      feeBudgetUZS: s.feeBudgetUZS,
    })),
  );
}
