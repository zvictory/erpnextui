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

/** A single production event for the playback timeline */
export interface ProductionEvent {
  timestamp: number;       // unix ms
  type: "wo_start" | "wo_complete" | "manufacture" | "transfer" | "quality_pass" | "quality_fail";
  equipmentId: string;     // linked equipment ID
  pipeId?: string;         // pipe that carries this flow
  label: string;           // human-readable description
  data: Record<string, unknown>;
}

/** Snapshot of factory state at a point in time */
export interface FactorySnapshot {
  time: number;
  activeEquipment: Set<string>;   // equipment IDs currently running
  activeFlows: Set<string>;       // pipe IDs with active flow
  alerts: Map<string, string>;    // equipmentId → alert message
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
