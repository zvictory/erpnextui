import { create } from "zustand";

interface FactoryTwinState {
  selectedEquipment: string | null;
  hoveredEquipment: string | null;
  showLabels: boolean;
  showGrid: boolean;
  showPipes: boolean;
  showFlow: boolean;
  setSelectedEquipment: (id: string | null) => void;
  setHoveredEquipment: (id: string | null) => void;
  toggleLabels: () => void;
  toggleGrid: () => void;
  togglePipes: () => void;
  toggleFlow: () => void;
}

export const useFactoryTwinStore = create<FactoryTwinState>((set) => ({
  selectedEquipment: null,
  hoveredEquipment: null,
  showLabels: true,
  showGrid: true,
  showPipes: true,
  showFlow: true,
  setSelectedEquipment: (id) => set({ selectedEquipment: id }),
  setHoveredEquipment: (id) => set({ hoveredEquipment: id }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  togglePipes: () => set((s) => ({ showPipes: !s.showPipes })),
  toggleFlow: () => set((s) => ({ showFlow: !s.showFlow })),
}));
