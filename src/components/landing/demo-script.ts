export type SceneId = "dashboard" | "invoice" | "report";

export interface SceneSpec {
  id: SceneId;
  startMs: number;
  endMs: number;
}

export const LOOP_MS = 16000;

export const SCENES: SceneSpec[] = [
  { id: "dashboard", startMs: 0, endMs: 5000 },
  { id: "invoice", startMs: 5000, endMs: 11000 },
  { id: "report", startMs: 11000, endMs: 16000 },
];

export function sceneAt(ms: number): SceneId {
  for (const scene of SCENES) {
    if (ms >= scene.startMs && ms < scene.endMs) return scene.id;
  }
  return SCENES[SCENES.length - 1].id;
}

export const SIDEBAR_NAV = [
  { label: "Дашборд", route: "/dashboard" },
  { label: "Продажи", route: "/sales-invoices" },
  { label: "Отчёты", route: "/reports/profit-loss" },
];

export const URL_PER_SCENE: Record<SceneId, string> = {
  dashboard: "app.erpstable.com/dashboard",
  invoice: "app.erpstable.com/sales-invoices",
  report: "app.erpstable.com/reports/profit-loss",
};
