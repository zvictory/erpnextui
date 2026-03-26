import { create } from "zustand";

interface FactoryTwinState {
  selectedEquipment: string | null;
  hoveredEquipment: string | null;
  showLabels: boolean;
  showGrid: boolean;
  setSelectedEquipment: (id: string | null) => void;
  setHoveredEquipment: (id: string | null) => void;
  toggleLabels: () => void;
  toggleGrid: () => void;
}

export const useFactoryTwinStore = create<FactoryTwinState>((set) => ({
  selectedEquipment: null,
  hoveredEquipment: null,
  showLabels: true,
  showGrid: true,
  setSelectedEquipment: (id) => set({ selectedEquipment: id }),
  setHoveredEquipment: (id) => set({ hoveredEquipment: id }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
}));
