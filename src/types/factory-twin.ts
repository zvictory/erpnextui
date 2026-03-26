export interface ParameterConfig {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  critical: number;
  source: "erpnext" | "mqtt" | "simulated";
}

export interface PipeConfig {
  id: string;
  from: string;
  to: string;
  waypoints: [number, number, number][];
  color?: string;
  radius?: number;
}

export interface Equipment {
  id: string;
  type: "tank" | "pump" | "line" | "compressor" | "generator" | "warehouse";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  label: string;
  parameters: ParameterConfig[];
  linkedWorkstation?: string;
  linkedWarehouse?: string;
  color?: string;
}
