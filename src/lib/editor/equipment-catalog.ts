import type { CatalogCategory } from "@/types/editor";

export const EQUIPMENT_CATALOG: CatalogCategory[] = [
  {
    category: "Qozonlar",
    items: [
      {
        type: "tank",
        label: "Smes qozon",
        icon: "cylinder",
        defaultColor: "#4a9eff",
        defaultScale: 1,
        defaultParams: [
          { key: "temperature", label: "Temperatura", unit: "°C", min: 20, max: 85, critical: 95, source: "erpnext" },
          { key: "pressure", label: "Bosim", unit: "MPa", min: 0.1, max: 0.6, critical: 0.8, source: "erpnext" },
          { key: "level", label: "Daraja", unit: "%", min: 0, max: 100, critical: 95, source: "erpnext" },
        ],
      },
    ],
  },
  {
    category: "Liniyalar",
    items: [
      {
        type: "line",
        label: "Ishlab chiqarish liniyasi",
        icon: "arrow-right",
        defaultColor: "#2ed573",
        defaultScale: 1,
        defaultParams: [
          { key: "speed", label: "Tezlik", unit: "dona/soat", min: 0, max: 500, critical: 600, source: "erpnext" },
          { key: "output", label: "Chiqim", unit: "kg/soat", min: 0, max: 200, critical: 250, source: "erpnext" },
        ],
      },
      {
        type: "line",
        label: "Qadoqlash liniyasi",
        icon: "package",
        defaultColor: "#a55eea",
        defaultScale: 1,
        defaultParams: [
          { key: "speed", label: "Tezlik", unit: "dona/soat", min: 0, max: 800, critical: 1000, source: "erpnext" },
          { key: "output", label: "Chiqim", unit: "dona/soat", min: 0, max: 600, critical: 750, source: "erpnext" },
        ],
      },
    ],
  },
  {
    category: "Skladlar",
    items: [
      {
        type: "warehouse",
        label: "Sklad",
        icon: "warehouse",
        defaultColor: "#a4b0be",
        defaultScale: 1,
        defaultParams: [],
      },
    ],
  },
  {
    category: "Yordamchi",
    items: [
      {
        type: "pump",
        label: "Nasos",
        icon: "fan",
        defaultColor: "#ff9f43",
        defaultScale: 0.6,
        defaultParams: [
          { key: "rpm", label: "Aylanish", unit: "ob/min", min: 500, max: 3000, critical: 3500, source: "erpnext" },
          { key: "flow", label: "Oqim", unit: "l/min", min: 0, max: 200, critical: 250, source: "erpnext" },
        ],
      },
      {
        type: "compressor",
        label: "Kompressor",
        icon: "gauge",
        defaultColor: "#636e72",
        defaultScale: 0.8,
        defaultParams: [
          { key: "pressure", label: "Bosim", unit: "bar", min: 0, max: 10, critical: 12, source: "erpnext" },
        ],
      },
      {
        type: "generator",
        label: "Generator",
        icon: "zap",
        defaultColor: "#fdcb6e",
        defaultScale: 0.8,
        defaultParams: [
          { key: "power", label: "Quvvat", unit: "kW", min: 0, max: 500, critical: 550, source: "erpnext" },
        ],
      },
    ],
  },
];
