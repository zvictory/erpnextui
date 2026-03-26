import type { Equipment } from "@/types/factory-twin";

// Zavod layouti — Surprise muzqaymoq ishlab chiqarish sexi
// Coordinate system: X = left-right, Y = up, Z = front-back
// 1 unit = 1 meter

export const FACTORY_LAYOUT: Equipment[] = [
  // === Smes qozonlar (Mixing Tanks) ===
  {
    id: "T-501",
    type: "tank",
    position: [-6, 0, -4],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 1",
    linkedWorkstation: "Qozon-1",
    color: "#4a9eff",
    parameters: [
      { key: "temperature", label: "Temperatura", unit: "°C", min: 20, max: 85, critical: 95, source: "erpnext" },
      { key: "pressure", label: "Bosim", unit: "MPa", min: 0.1, max: 0.6, critical: 0.8, source: "erpnext" },
      { key: "level", label: "Daraja", unit: "%", min: 0, max: 100, critical: 95, source: "erpnext" },
    ],
  },
  {
    id: "T-502",
    type: "tank",
    position: [0, 0, -4],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 2",
    linkedWorkstation: "Qozon-2",
    color: "#4a9eff",
    parameters: [
      { key: "temperature", label: "Temperatura", unit: "°C", min: 20, max: 85, critical: 95, source: "erpnext" },
      { key: "pressure", label: "Bosim", unit: "MPa", min: 0.1, max: 0.6, critical: 0.8, source: "erpnext" },
    ],
  },
  {
    id: "T-503",
    type: "tank",
    position: [6, 0, -4],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 3",
    linkedWorkstation: "Qozon-3",
    color: "#4a9eff",
    parameters: [
      { key: "temperature", label: "Temperatura", unit: "°C", min: 20, max: 85, critical: 95, source: "erpnext" },
    ],
  },

  // === Nasoslar (Pumps) ===
  {
    id: "P-101",
    type: "pump",
    position: [-3, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.6,
    label: "Nasos 1",
    color: "#ff9f43",
    parameters: [
      { key: "rpm", label: "Aylanish", unit: "ob/min", min: 500, max: 3000, critical: 3500, source: "erpnext" },
      { key: "flow", label: "Oqim", unit: "l/min", min: 0, max: 200, critical: 250, source: "erpnext" },
    ],
  },
  {
    id: "P-102",
    type: "pump",
    position: [3, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.6,
    label: "Nasos 2",
    color: "#ff9f43",
    parameters: [
      { key: "rpm", label: "Aylanish", unit: "ob/min", min: 500, max: 3000, critical: 3500, source: "erpnext" },
    ],
  },

  // === Ishlab chiqarish liniyasi (Production Line / Conveyor) ===
  {
    id: "L-101",
    type: "line",
    position: [0, 0, 4],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Muzqaymoq liniyasi 1",
    linkedWorkstation: "Liniya-1",
    color: "#2ed573",
    parameters: [
      { key: "speed", label: "Tezlik", unit: "dona/soat", min: 0, max: 500, critical: 600, source: "erpnext" },
      { key: "output", label: "Chiqim", unit: "kg/soat", min: 0, max: 200, critical: 250, source: "erpnext" },
    ],
  },

  // === Tayyor mahsulot skladi (Finished Goods Warehouse) ===
  {
    id: "WH-01",
    type: "warehouse",
    position: [0, 0, 10],
    rotation: [0, 0, 0],
    scale: 1.2,
    label: "Tayyor mahsulot skladi",
    linkedWarehouse: "Main Warehouse",
    color: "#a4b0be",
    parameters: [],
  },
];
