import { create } from "zustand";
import type { TimesheetEntry } from "@/types/costing";

function calcHours(start: string, end: string): number {
  const s = new Date(`2000-01-01T${start}`);
  const e = new Date(`2000-01-01T${end}`);
  const ms = e.getTime() - s.getTime();
  return ms > 0 ? Math.round((ms / 3_600_000) * 100) / 100 : 0;
}

interface TimesheetState {
  workOrder: string | null;
  selectedEmployees: string[];
  entries: TimesheetEntry[];

  setWorkOrder: (wo: string) => void;
  toggleEmployee: (employeeId: string) => void;
  addEntry: (entry: Omit<TimesheetEntry, "hours" | "amount"> & { hours?: number }) => void;
  updateEntry: (index: number, updates: Partial<TimesheetEntry>) => void;
  updateHours: (index: number, hours: number) => void;
  removeEntry: (index: number) => void;
  setDateForAll: (date: string) => void;
  getTotals: () => { hours: number; amount: number };
  reset: () => void;
}

export const useTimesheetStore = create<TimesheetState>((set, get) => ({
  workOrder: null,
  selectedEmployees: [],
  entries: [],

  setWorkOrder: (wo) => set({ workOrder: wo }),

  toggleEmployee: (id) =>
    set((s) => ({
      selectedEmployees: s.selectedEmployees.includes(id)
        ? s.selectedEmployees.filter((e) => e !== id)
        : [...s.selectedEmployees, id],
    })),

  addEntry: (entry) => {
    const hours =
      entry.hours !== undefined ? entry.hours : calcHours(entry.start_time, entry.end_time);
    const amount = Math.round(hours * entry.hourly_rate);
    set((s) => ({ entries: [...s.entries, { ...entry, hours, amount }] }));
  },

  updateEntry: (i, updates) =>
    set((s) => {
      const newEntries = [...s.entries];
      const e = { ...newEntries[i], ...updates };

      if (updates.start_time !== undefined || updates.end_time !== undefined) {
        e.hours = calcHours(e.start_time, e.end_time);
      }
      e.amount = Math.round(e.hours * e.hourly_rate);

      newEntries[i] = e;
      return { entries: newEntries };
    }),

  updateHours: (i, hours) =>
    set((s) => {
      const newEntries = [...s.entries];
      const e = { ...newEntries[i], hours };
      e.amount = Math.round(hours * e.hourly_rate);
      newEntries[i] = e;
      return { entries: newEntries };
    }),

  removeEntry: (i) =>
    set((s) => ({
      entries: s.entries.filter((_, idx) => idx !== i),
    })),

  setDateForAll: (date) => set((s) => ({ entries: s.entries.map((e) => ({ ...e, date })) })),

  getTotals: () => {
    const entries = get().entries;
    return {
      hours: entries.reduce((s, e) => s + e.hours, 0),
      amount: entries.reduce((s, e) => s + e.amount, 0),
    };
  },

  reset: () => set({ workOrder: null, selectedEmployees: [], entries: [] }),
}));
