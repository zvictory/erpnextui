import type { Equipment, PipeConfig, ParameterConfig } from "./factory-twin";

export type EditorTool = "select" | "move" | "rotate" | "scale" | "pipe" | "delete";

export type EquipmentType = Equipment["type"];

export interface CatalogItem {
  type: EquipmentType;
  subtype: string;
  label: string;
  icon: string;
  defaultColor: string;
  defaultScale: number;
  defaultParams: ParameterConfig[];
  idPrefix: string;
}

export interface LineTemplateStage {
  subtype: string;
  label: string;
}

export interface ProductionLineTemplate {
  id: string;
  name: string;
  description: string;
  stages: LineTemplateStage[];
}

export interface CatalogCategory {
  category: string;
  items: CatalogItem[];
}

export interface ProductionLineConfig {
  id: string;
  name: string;
  stages: string[]; // equipment IDs in order
}

export interface PipeDrawingState {
  active: boolean;
  fromId: string | null;
  waypoints: [number, number, number][];
}

export interface FactoryLayout {
  version: "1.0";
  name: string;
  created: string;
  modified: string;
  equipment: Equipment[];
  pipes: PipeConfig[];
  productionLines: ProductionLineConfig[];
  canvas: {
    gridSize: number;
    cameraPosition: [number, number, number];
    cameraTarget: [number, number, number];
  };
}

export interface ValidationMessage {
  level: "error" | "warning";
  message: string;
  equipmentId?: string;
  pipeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
}
