import { create } from "zustand";
import { temporal } from "zundo";
import type { Equipment, PipeConfig, ParameterConfig } from "@/types/factory-twin";
import type { EditorTool, PipeDrawingState, ProductionLineConfig } from "@/types/editor";
import { FACTORY_LAYOUT, PIPE_NETWORK } from "@/config/factory-layout";

interface EditorState {
  // Tool
  activeTool: EditorTool;
  setTool: (tool: EditorTool) => void;

  // Selection
  selectedIds: string[];
  hoveredId: string | null;
  selectEquipment: (id: string, multi?: boolean) => void;
  setHovered: (id: string | null) => void;
  clearSelection: () => void;

  // Grid
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  setGridSize: (size: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  // Layout data
  equipment: Equipment[];
  pipes: PipeConfig[];
  productionLines: ProductionLineConfig[];

  // Equipment CRUD
  addEquipment: (eq: Equipment) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  duplicateEquipment: (id: string) => void;

  // Transform
  moveEquipment: (id: string, position: [number, number, number]) => void;
  rotateEquipment: (id: string, rotation: [number, number, number]) => void;
  scaleEquipment: (id: string, scale: number) => void;

  // Pipes
  pipeDrawing: PipeDrawingState;
  startPipeDrawing: (fromId: string) => void;
  addPipeWaypoint: (point: [number, number, number]) => void;
  finishPipeDrawing: (toId: string) => void;
  cancelPipeDrawing: () => void;
  deletePipe: (id: string) => void;
  updatePipe: (id: string, updates: Partial<PipeConfig>) => void;

  // Production Lines
  createProductionLine: (name: string, stages: string[]) => void;
  updateProductionLine: (id: string, updates: Partial<ProductionLineConfig>) => void;
  deleteProductionLine: (id: string) => void;

  // Clipboard
  clipboard: Equipment[];
  copySelected: () => void;
  pasteFromClipboard: (offset?: [number, number, number]) => void;

  // Dirty state
  isDirty: boolean;
  lastSaved: string | null;
  markClean: () => void;

  // Bulk
  loadLayout: (equipment: Equipment[], pipes: PipeConfig[], lines: ProductionLineConfig[]) => void;
  resetToFactory: () => void;
}

function generateId(type: string, existing: Equipment[]): string {
  const prefix =
    type === "tank" ? "T" : type === "line" ? "L" : type === "warehouse" ? "WH" : type === "pump" ? "P" : "EQ";
  const nums = existing
    .filter((e) => e.id.startsWith(prefix + "-"))
    .map((e) => parseInt(e.id.split("-")[1], 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function snapPosition(pos: [number, number, number], gridSize: number): [number, number, number] {
  return [
    Math.round(pos[0] / gridSize) * gridSize,
    pos[1],
    Math.round(pos[2] / gridSize) * gridSize,
  ];
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      // Tool
      activeTool: "select",
      setTool: (tool) => set({ activeTool: tool }),

      // Selection
      selectedIds: [],
      hoveredId: null,
      selectEquipment: (id, multi) =>
        set((s) => ({
          selectedIds: multi
            ? s.selectedIds.includes(id)
              ? s.selectedIds.filter((i) => i !== id)
              : [...s.selectedIds, id]
            : [id],
        })),
      setHovered: (id) => set({ hoveredId: id }),
      clearSelection: () => set({ selectedIds: [] }),

      // Grid
      gridSize: 1,
      showGrid: true,
      snapToGrid: true,
      setGridSize: (size) => set({ gridSize: size }),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

      // Layout data — initialize from current factory config
      equipment: [...FACTORY_LAYOUT],
      pipes: [...PIPE_NETWORK],
      productionLines: [],

      // Equipment CRUD
      addEquipment: (eq) =>
        set((s) => ({
          equipment: [...s.equipment, eq],
          selectedIds: [eq.id],
          isDirty: true,
        })),

      updateEquipment: (id, updates) =>
        set((s) => ({
          equipment: s.equipment.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          isDirty: true,
        })),

      deleteEquipment: (id) =>
        set((s) => ({
          equipment: s.equipment.filter((e) => e.id !== id),
          pipes: s.pipes.filter((p) => p.from !== id && p.to !== id),
          selectedIds: s.selectedIds.filter((i) => i !== id),
          isDirty: true,
        })),

      duplicateEquipment: (id) => {
        const s = get();
        const eq = s.equipment.find((e) => e.id === id);
        if (!eq) return;
        const newId = generateId(eq.type, s.equipment);
        const offset: [number, number, number] = [eq.position[0] + 2, eq.position[1], eq.position[2] + 2];
        const pos = s.snapToGrid ? snapPosition(offset, s.gridSize) : offset;
        set({
          equipment: [...s.equipment, { ...eq, id: newId, label: `${eq.label} (copy)`, position: pos }],
          selectedIds: [newId],
          isDirty: true,
        });
      },

      // Transform
      moveEquipment: (id, position) => {
        const s = get();
        const pos = s.snapToGrid ? snapPosition(position, s.gridSize) : position;
        set({
          equipment: s.equipment.map((e) => (e.id === id ? { ...e, position: pos } : e)),
          isDirty: true,
        });
      },

      rotateEquipment: (id, rotation) =>
        set((s) => ({
          equipment: s.equipment.map((e) => (e.id === id ? { ...e, rotation } : e)),
          isDirty: true,
        })),

      scaleEquipment: (id, scale) =>
        set((s) => ({
          equipment: s.equipment.map((e) => (e.id === id ? { ...e, scale } : e)),
          isDirty: true,
        })),

      // Pipes
      pipeDrawing: { active: false, fromId: null, waypoints: [] },

      startPipeDrawing: (fromId) =>
        set({ pipeDrawing: { active: true, fromId, waypoints: [] } }),

      addPipeWaypoint: (point) => {
        const s = get();
        const wp = s.snapToGrid ? snapPosition(point, s.gridSize) : point;
        set({ pipeDrawing: { ...s.pipeDrawing, waypoints: [...s.pipeDrawing.waypoints, wp] } });
      },

      finishPipeDrawing: (toId) => {
        const s = get();
        if (!s.pipeDrawing.fromId || s.pipeDrawing.fromId === toId) {
          set({ pipeDrawing: { active: false, fromId: null, waypoints: [] } });
          return;
        }
        const pipeId = `pipe-${s.pipeDrawing.fromId}-${toId}`.replace(/[^a-zA-Z0-9-]/g, "");
        const existing = s.pipes.find((p) => p.id === pipeId);
        if (existing) {
          set({ pipeDrawing: { active: false, fromId: null, waypoints: [] } });
          return;
        }
        set({
          pipes: [
            ...s.pipes,
            {
              id: pipeId,
              from: s.pipeDrawing.fromId,
              to: toId,
              waypoints: s.pipeDrawing.waypoints.length > 0
                ? s.pipeDrawing.waypoints
                : computeDefaultWaypoints(s.pipeDrawing.fromId, toId, s.equipment),
            },
          ],
          pipeDrawing: { active: false, fromId: null, waypoints: [] },
          isDirty: true,
        });
      },

      cancelPipeDrawing: () =>
        set({ pipeDrawing: { active: false, fromId: null, waypoints: [] } }),

      deletePipe: (id) =>
        set((s) => ({
          pipes: s.pipes.filter((p) => p.id !== id),
          isDirty: true,
        })),

      updatePipe: (id, updates) =>
        set((s) => ({
          pipes: s.pipes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          isDirty: true,
        })),

      // Production Lines
      createProductionLine: (name, stages) => {
        const id = `line-${Date.now()}`;
        set((s) => ({
          productionLines: [...s.productionLines, { id, name, stages }],
          isDirty: true,
        }));
      },

      updateProductionLine: (id, updates) =>
        set((s) => ({
          productionLines: s.productionLines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
          isDirty: true,
        })),

      deleteProductionLine: (id) =>
        set((s) => ({
          productionLines: s.productionLines.filter((l) => l.id !== id),
          isDirty: true,
        })),

      // Clipboard
      clipboard: [],
      copySelected: () => {
        const s = get();
        const copied = s.equipment.filter((e) => s.selectedIds.includes(e.id));
        set({ clipboard: copied });
      },

      pasteFromClipboard: (offset = [3, 0, 3]) => {
        const s = get();
        if (s.clipboard.length === 0) return;
        const newItems: Equipment[] = s.clipboard.map((eq) => {
          const newId = generateId(eq.type, [...s.equipment]);
          const pos: [number, number, number] = [
            eq.position[0] + offset[0],
            eq.position[1] + offset[1],
            eq.position[2] + offset[2],
          ];
          return { ...eq, id: newId, label: `${eq.label} (copy)`, position: pos };
        });
        set({
          equipment: [...s.equipment, ...newItems],
          selectedIds: newItems.map((e) => e.id),
          isDirty: true,
        });
      },

      // Dirty
      isDirty: false,
      lastSaved: null,
      markClean: () => set({ isDirty: false, lastSaved: new Date().toISOString() }),

      // Bulk
      loadLayout: (equipment, pipes, lines) =>
        set({ equipment, pipes, productionLines: lines, isDirty: false, selectedIds: [] }),

      resetToFactory: () =>
        set({
          equipment: [...FACTORY_LAYOUT],
          pipes: [...PIPE_NETWORK],
          productionLines: [],
          selectedIds: [],
          isDirty: false,
        }),
    }),
    {
      limit: 50,
      partialize: (state) => ({
        equipment: state.equipment,
        pipes: state.pipes,
        productionLines: state.productionLines,
      }),
    },
  ),
);

function computeDefaultWaypoints(
  fromId: string,
  toId: string,
  equipment: Equipment[],
): [number, number, number][] {
  const fromEq = equipment.find((e) => e.id === fromId);
  const toEq = equipment.find((e) => e.id === toId);
  if (!fromEq || !toEq) return [];
  const midZ = (fromEq.position[2] + toEq.position[2]) / 2;
  return [[fromEq.position[0], 0.5, midZ]];
}
