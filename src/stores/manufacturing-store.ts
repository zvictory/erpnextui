import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimerState {
  startedAt: number;
  elapsed: number;
}

interface ManufacturingState {
  woViewMode: "table" | "kanban";
  setWoViewMode: (mode: "table" | "kanban") => void;

  activeTimers: Record<string, TimerState>;
  startTimer: (jobCardName: string) => void;
  pauseTimer: (jobCardName: string) => void;
  clearTimer: (jobCardName: string) => void;
  getElapsed: (jobCardName: string) => number;
}

export const useManufacturingStore = create<ManufacturingState>()(
  persist(
    (set, get) => ({
      woViewMode: "table",
      setWoViewMode: (mode) => set({ woViewMode: mode }),

      activeTimers: {},

      startTimer: (jobCardName) =>
        set((state) => ({
          activeTimers: {
            ...state.activeTimers,
            [jobCardName]: {
              startedAt: Date.now(),
              elapsed: state.activeTimers[jobCardName]?.elapsed ?? 0,
            },
          },
        })),

      pauseTimer: (jobCardName) =>
        set((state) => {
          const timer = state.activeTimers[jobCardName];
          if (!timer || !timer.startedAt) return state;
          return {
            activeTimers: {
              ...state.activeTimers,
              [jobCardName]: {
                startedAt: 0,
                elapsed: timer.elapsed + (Date.now() - timer.startedAt),
              },
            },
          };
        }),

      clearTimer: (jobCardName) =>
        set((state) => {
          const { [jobCardName]: _removed, ...rest } = state.activeTimers;
          return { activeTimers: rest };
        }),

      getElapsed: (jobCardName) => {
        const timer = get().activeTimers[jobCardName];
        if (!timer) return 0;
        if (timer.startedAt) {
          return timer.elapsed + (Date.now() - timer.startedAt);
        }
        return timer.elapsed;
      },
    }),
    {
      name: "erpnext-manufacturing",
    },
  ),
);
