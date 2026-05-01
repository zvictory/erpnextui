"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EmployeeView = "calendar" | "table";
export type Metric = "worked" | "absent" | "late";
export type ListStatusFilter = "all" | "clean" | "hasFees" | "frequentAbsent" | "frequentLate";
export type DayStatusFilter =
  | "all"
  | "present"
  | "late_flat"
  | "late_step"
  | "half_day"
  | "absent"
  | "incomplete";

interface UIState {
  employeeView: EmployeeView;
  setEmployeeView: (v: EmployeeView) => void;
  metric: Metric;
  setMetric: (v: Metric) => void;
  listShiftFilter: string;
  setListShiftFilter: (v: string) => void;
  listStatusFilter: ListStatusFilter;
  setListStatusFilter: (v: ListStatusFilter) => void;
  dayStatusFilter: DayStatusFilter;
  setDayStatusFilter: (v: DayStatusFilter) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      employeeView: "calendar",
      setEmployeeView: (v) => set({ employeeView: v }),
      metric: "worked",
      setMetric: (v) => set({ metric: v }),
      listShiftFilter: "",
      setListShiftFilter: (v) => set({ listShiftFilter: v }),
      listStatusFilter: "all",
      setListStatusFilter: (v) => set({ listStatusFilter: v }),
      dayStatusFilter: "all",
      setDayStatusFilter: (v) => set({ dayStatusFilter: v }),
    }),
    {
      name: "attendance-ui",
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (p.employeeView === "grid") p.employeeView = "calendar";
        return p as unknown as UIState;
      },
    },
  ),
);
