import type { Equipment, PipeConfig } from "@/types/factory-twin";

// Zavod layouti — Surprise muzqaymoq ishlab chiqarish sexi
// Coordinate system: X = left-right, Y = up, Z = front-back
// 1 unit = 1 meter
//
// Layout (back → front):
//   Row 1 (Z=-14): WH-RAW
//   Row 2 (Z=-8):  T-501  T-502  T-503  T-504  T-505
//   Row 3 (Z=-3):  WH-SEMI
//   Row 4 (Z=2):   L-101  L-102  L-103
//   Row 5 (Z=6):   WH-MID
//   Row 6 (Z=10):  L-104  L-105  L-106
//   Row 7 (Z=16):  WH-FIN

// === Reusable parameter templates ===

const TANK_PARAMS_FULL = [
  {
    key: "temperature",
    label: "Temperatura",
    unit: "°C",
    min: 20,
    max: 85,
    critical: 95,
    source: "erpnext" as const,
  },
  {
    key: "pressure",
    label: "Bosim",
    unit: "MPa",
    min: 0.1,
    max: 0.6,
    critical: 0.8,
    source: "erpnext" as const,
  },
  {
    key: "level",
    label: "Daraja",
    unit: "%",
    min: 0,
    max: 100,
    critical: 95,
    source: "erpnext" as const,
  },
];

const TANK_PARAMS_TP = [
  {
    key: "temperature",
    label: "Temperatura",
    unit: "°C",
    min: 20,
    max: 85,
    critical: 95,
    source: "erpnext" as const,
  },
  {
    key: "pressure",
    label: "Bosim",
    unit: "MPa",
    min: 0.1,
    max: 0.6,
    critical: 0.8,
    source: "erpnext" as const,
  },
];

const TANK_PARAMS_T = [
  {
    key: "temperature",
    label: "Temperatura",
    unit: "°C",
    min: 20,
    max: 85,
    critical: 95,
    source: "erpnext" as const,
  },
];

const PRODUCTION_LINE_PARAMS = [
  {
    key: "speed",
    label: "Tezlik",
    unit: "dona/soat",
    min: 0,
    max: 500,
    critical: 600,
    source: "erpnext" as const,
  },
  {
    key: "output",
    label: "Chiqim",
    unit: "kg/soat",
    min: 0,
    max: 200,
    critical: 250,
    source: "erpnext" as const,
  },
];

const PACKAGING_LINE_PARAMS = [
  {
    key: "speed",
    label: "Tezlik",
    unit: "dona/soat",
    min: 0,
    max: 800,
    critical: 1000,
    source: "erpnext" as const,
  },
  {
    key: "output",
    label: "Chiqim",
    unit: "dona/soat",
    min: 0,
    max: 600,
    critical: 750,
    source: "erpnext" as const,
  },
];

export const FACTORY_LAYOUT: Equipment[] = [
  // === Row 1: Xom ashyo skladi (Raw Material Warehouse) ===
  {
    id: "WH-RAW",
    type: "warehouse",
    position: [0, 0, -14],
    rotation: [0, 0, 0],
    scale: 1.3,
    label: "Xom ashyo skladi",
    linkedWarehouse: "Xom ashyo skladi",
    color: "#c49b66",
    parameters: [],
  },

  // === Row 2: Smes qozonlar (Mixing Tanks) ===
  {
    id: "T-501",
    type: "tank",
    position: [-10, 0, -8],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 1",
    linkedWorkstation: "Qozon-1",
    color: "#4a9eff",
    parameters: TANK_PARAMS_FULL,
  },
  {
    id: "T-502",
    type: "tank",
    position: [-5, 0, -8],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 2",
    linkedWorkstation: "Qozon-2",
    color: "#4a9eff",
    parameters: TANK_PARAMS_TP,
  },
  {
    id: "T-503",
    type: "tank",
    position: [0, 0, -8],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 3",
    linkedWorkstation: "Qozon-3",
    color: "#4a9eff",
    parameters: TANK_PARAMS_T,
  },
  {
    id: "T-504",
    type: "tank",
    position: [5, 0, -8],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 4",
    linkedWorkstation: "Qozon-4",
    color: "#4a9eff",
    parameters: TANK_PARAMS_FULL,
  },
  {
    id: "T-505",
    type: "tank",
    position: [10, 0, -8],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Smes qozon 5",
    linkedWorkstation: "Qozon-5",
    color: "#4a9eff",
    parameters: TANK_PARAMS_FULL,
  },

  // === Row 3: Yarim tayyor skladi (Semi-finished Goods Warehouse) ===
  {
    id: "WH-SEMI",
    type: "warehouse",
    position: [0, 0, -3],
    rotation: [0, 0, 0],
    scale: 0.9,
    label: "Yarim tayyor skladi",
    linkedWarehouse: "Yarim tayyor skladi",
    color: "#a4b0be",
    parameters: [],
  },

  // === Row 4: Ishlab chiqarish liniyalari (Production Lines) ===
  {
    id: "L-101",
    type: "line",
    position: [-10, 0, 2],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Muzqaymoq liniyasi 1",
    linkedWorkstation: "Liniya-1",
    color: "#2ed573",
    parameters: PRODUCTION_LINE_PARAMS,
  },
  {
    id: "L-102",
    type: "line",
    position: [0, 0, 2],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Muzqaymoq liniyasi 2",
    linkedWorkstation: "Liniya-2",
    color: "#2ed573",
    parameters: PRODUCTION_LINE_PARAMS,
  },
  {
    id: "L-103",
    type: "line",
    position: [10, 0, 2],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Muzqaymoq liniyasi 3",
    linkedWorkstation: "Liniya-3",
    color: "#2ed573",
    parameters: PRODUCTION_LINE_PARAMS,
  },

  // === Row 5: Oraliq sklad (Intermediate Warehouse) ===
  {
    id: "WH-MID",
    type: "warehouse",
    position: [0, 0, 6],
    rotation: [0, 0, 0],
    scale: 0.7,
    label: "Oraliq sklad",
    linkedWarehouse: "Oraliq sklad",
    color: "#a4b0be",
    parameters: [],
  },

  // === Row 6: Qadoqlash liniyalari (Packaging Lines) ===
  {
    id: "L-104",
    type: "line",
    position: [-10, 0, 10],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Qadoqlash liniyasi 1",
    linkedWorkstation: "Liniya-4",
    color: "#a55eea",
    parameters: PACKAGING_LINE_PARAMS,
  },
  {
    id: "L-105",
    type: "line",
    position: [0, 0, 10],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Qadoqlash liniyasi 2",
    linkedWorkstation: "Liniya-5",
    color: "#a55eea",
    parameters: PACKAGING_LINE_PARAMS,
  },
  {
    id: "L-106",
    type: "line",
    position: [10, 0, 10],
    rotation: [0, 0, 0],
    scale: 1,
    label: "Qadoqlash liniyasi 3",
    linkedWorkstation: "Liniya-6",
    color: "#a55eea",
    parameters: PACKAGING_LINE_PARAMS,
  },

  // === Row 7: Tayyor mahsulot skladi (Finished Goods Warehouse) ===
  {
    id: "WH-FIN",
    type: "warehouse",
    position: [0, 0, 16],
    rotation: [0, 0, 0],
    scale: 1.4,
    label: "Tayyor mahsulot skladi",
    linkedWarehouse: "Tayyor mahsulot skladi",
    color: "#778ca3",
    parameters: [],
  },
];

// Pipe connections between equipment
// Waypoints route pipes with smooth CatmullRom curves
// Y=0.5 is the standard pipe height
export const PIPE_NETWORK: PipeConfig[] = [
  // === Group A: WH-RAW → Tanks (fan out) ===
  {
    id: "pipe-WHRAW-T501",
    from: "WH-RAW",
    to: "T-501",
    waypoints: [
      [0, 0.5, -12],
      [-10, 0.5, -11],
    ],
  },
  {
    id: "pipe-WHRAW-T502",
    from: "WH-RAW",
    to: "T-502",
    waypoints: [
      [0, 0.5, -12],
      [-5, 0.5, -11],
    ],
  },
  {
    id: "pipe-WHRAW-T503",
    from: "WH-RAW",
    to: "T-503",
    waypoints: [[0, 0.5, -11]],
  },
  {
    id: "pipe-WHRAW-T504",
    from: "WH-RAW",
    to: "T-504",
    waypoints: [
      [0, 0.5, -12],
      [5, 0.5, -11],
    ],
  },
  {
    id: "pipe-WHRAW-T505",
    from: "WH-RAW",
    to: "T-505",
    waypoints: [
      [0, 0.5, -12],
      [10, 0.5, -11],
    ],
  },

  // === Group B: Tanks → WH-SEMI (converge) ===
  {
    id: "pipe-T501-WHSEMI",
    from: "T-501",
    to: "WH-SEMI",
    waypoints: [
      [-10, 0.5, -6],
      [-4, 0.5, -5],
    ],
  },
  {
    id: "pipe-T502-WHSEMI",
    from: "T-502",
    to: "WH-SEMI",
    waypoints: [
      [-5, 0.5, -6],
      [-2, 0.5, -5],
    ],
  },
  {
    id: "pipe-T503-WHSEMI",
    from: "T-503",
    to: "WH-SEMI",
    waypoints: [[0, 0.5, -5.5]],
  },
  {
    id: "pipe-T504-WHSEMI",
    from: "T-504",
    to: "WH-SEMI",
    waypoints: [
      [5, 0.5, -6],
      [2, 0.5, -5],
    ],
  },
  {
    id: "pipe-T505-WHSEMI",
    from: "T-505",
    to: "WH-SEMI",
    waypoints: [
      [10, 0.5, -6],
      [4, 0.5, -5],
    ],
  },

  // === Group C: WH-SEMI → Production Lines (fan out) ===
  {
    id: "pipe-WHSEMI-L101",
    from: "WH-SEMI",
    to: "L-101",
    waypoints: [
      [0, 0.5, -1],
      [-6, 0.5, 0],
      [-10, 0.5, 1],
    ],
  },
  {
    id: "pipe-WHSEMI-L102",
    from: "WH-SEMI",
    to: "L-102",
    waypoints: [[0, 0.5, -0.5]],
  },
  {
    id: "pipe-WHSEMI-L103",
    from: "WH-SEMI",
    to: "L-103",
    waypoints: [
      [0, 0.5, -1],
      [6, 0.5, 0],
      [10, 0.5, 1],
    ],
  },

  // === Group D: Production Lines → WH-MID (converge) ===
  {
    id: "pipe-L101-WHMID",
    from: "L-101",
    to: "WH-MID",
    waypoints: [
      [-10, 0.5, 3.5],
      [-4, 0.5, 4.5],
    ],
  },
  {
    id: "pipe-L102-WHMID",
    from: "L-102",
    to: "WH-MID",
    waypoints: [[0, 0.5, 4]],
  },
  {
    id: "pipe-L103-WHMID",
    from: "L-103",
    to: "WH-MID",
    waypoints: [
      [10, 0.5, 3.5],
      [4, 0.5, 4.5],
    ],
  },

  // === Group E: WH-MID → Packaging Lines (fan out) ===
  {
    id: "pipe-WHMID-L104",
    from: "WH-MID",
    to: "L-104",
    waypoints: [
      [0, 0.5, 7.5],
      [-6, 0.5, 8],
      [-10, 0.5, 9],
    ],
  },
  {
    id: "pipe-WHMID-L105",
    from: "WH-MID",
    to: "L-105",
    waypoints: [[0, 0.5, 8]],
  },
  {
    id: "pipe-WHMID-L106",
    from: "WH-MID",
    to: "L-106",
    waypoints: [
      [0, 0.5, 7.5],
      [6, 0.5, 8],
      [10, 0.5, 9],
    ],
  },

  // === Group F: Packaging Lines → WH-FIN (converge) ===
  {
    id: "pipe-L104-WHFIN",
    from: "L-104",
    to: "WH-FIN",
    waypoints: [
      [-10, 0.5, 12],
      [-4, 0.5, 13],
    ],
  },
  {
    id: "pipe-L105-WHFIN",
    from: "L-105",
    to: "WH-FIN",
    waypoints: [[0, 0.5, 13]],
  },
  {
    id: "pipe-L106-WHFIN",
    from: "L-106",
    to: "WH-FIN",
    waypoints: [
      [10, 0.5, 12],
      [4, 0.5, 13],
    ],
  },
];
