import type { Equipment, PipeConfig } from "@/types/factory-twin";
import type { FactoryLayout, ProductionLineConfig } from "@/types/editor";

const STORAGE_KEY = "factory-layout-autosave";
const VERSION = "1.0" as const;

export function serializeLayout(
  equipment: Equipment[],
  pipes: PipeConfig[],
  productionLines: ProductionLineConfig[],
  name = "Untitled Layout",
): FactoryLayout {
  return {
    version: VERSION,
    name,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    equipment,
    pipes,
    productionLines,
    canvas: {
      gridSize: 1,
      cameraPosition: [28, 22, 28],
      cameraTarget: [0, 0, 1],
    },
  };
}

export function deserializeLayout(json: string): FactoryLayout {
  const data = JSON.parse(json) as FactoryLayout;
  if (data.version !== VERSION) {
    throw new Error(`Unsupported layout version: ${data.version}`);
  }
  if (!Array.isArray(data.equipment) || !Array.isArray(data.pipes)) {
    throw new Error("Invalid layout: missing equipment or pipes array");
  }
  return data;
}

export function exportAsJson(layout: FactoryLayout): string {
  return JSON.stringify(layout, null, 2);
}

export function downloadJson(layout: FactoryLayout): void {
  const json = exportAsJson(layout);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${layout.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveToLocalStorage(layout: FactoryLayout): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function loadFromLocalStorage(): FactoryLayout | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return deserializeLayout(raw);
  } catch {
    return null;
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
