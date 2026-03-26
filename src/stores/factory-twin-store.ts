import { create } from "zustand";
import type { ProductionEvent, FactorySnapshot } from "@/types/factory-twin";

interface FactoryTwinState {
  // UI toggles
  selectedEquipment: string | null;
  hoveredEquipment: string | null;
  showLabels: boolean;
  showGrid: boolean;
  showPipes: boolean;
  showFlow: boolean;

  // Playback
  mode: "live" | "playback";
  isPlaying: boolean;
  speed: number;              // 1, 2, 5, 10
  timelineStart: number;      // unix ms
  timelineEnd: number;        // unix ms
  currentTime: number;        // unix ms — playback cursor
  events: ProductionEvent[];
  snapshot: FactorySnapshot | null;

  // UI actions
  setSelectedEquipment: (id: string | null) => void;
  setHoveredEquipment: (id: string | null) => void;
  toggleLabels: () => void;
  toggleGrid: () => void;
  togglePipes: () => void;
  toggleFlow: () => void;

  // Playback actions
  setMode: (mode: "live" | "playback") => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  seek: (time: number) => void;
  setTimeline: (start: number, end: number, events: ProductionEvent[]) => void;
  setSnapshot: (snapshot: FactorySnapshot | null) => void;
  advanceTime: (deltaMs: number) => void;
}

const now = Date.now();
const twoHoursAgo = now - 2 * 60 * 60 * 1000;

export const useFactoryTwinStore = create<FactoryTwinState>((set, get) => ({
  selectedEquipment: null,
  hoveredEquipment: null,
  showLabels: true,
  showGrid: true,
  showPipes: true,
  showFlow: true,

  mode: "live",
  isPlaying: false,
  speed: 1,
  timelineStart: twoHoursAgo,
  timelineEnd: now,
  currentTime: twoHoursAgo,
  events: [],
  snapshot: null,

  setSelectedEquipment: (id) => set({ selectedEquipment: id }),
  setHoveredEquipment: (id) => set({ hoveredEquipment: id }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  togglePipes: () => set((s) => ({ showPipes: !s.showPipes })),
  toggleFlow: () => set((s) => ({ showFlow: !s.showFlow })),

  setMode: (mode) => set({ mode, isPlaying: false }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  seek: (time) => set({ currentTime: time }),
  setTimeline: (start, end, events) =>
    set({ timelineStart: start, timelineEnd: end, events, currentTime: start }),
  setSnapshot: (snapshot) => set({ snapshot }),
  advanceTime: (deltaMs) => {
    const { currentTime, timelineEnd, speed } = get();
    const next = currentTime + deltaMs * speed;
    if (next >= timelineEnd) {
      set({ currentTime: timelineEnd, isPlaying: false });
    } else {
      set({ currentTime: next });
    }
  },
}));
