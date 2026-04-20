import type { ProductionEvent, FactorySnapshot } from "@/types/factory-twin";

/**
 * Compute factory state at a given point in time by replaying events up to that time.
 * Events must be sorted by timestamp.
 */
export function buildSnapshot(events: ProductionEvent[], atTime: number): FactorySnapshot {
  const activeEquipment = new Set<string>();
  const activeFlows = new Set<string>();
  const alerts = new Map<string, string>();

  for (const event of events) {
    if (event.timestamp > atTime) break;

    switch (event.type) {
      case "wo_start":
        activeEquipment.add(event.equipmentId);
        break;
      case "wo_complete":
        activeEquipment.delete(event.equipmentId);
        break;
      case "manufacture":
        activeEquipment.add(event.equipmentId);
        if (event.pipeId) activeFlows.add(event.pipeId);
        break;
      case "transfer":
        if (event.pipeId) activeFlows.add(event.pipeId);
        break;
      case "quality_fail":
        alerts.set(event.equipmentId, event.label);
        break;
      case "quality_pass":
        alerts.delete(event.equipmentId);
        break;
    }
  }

  return { time: atTime, activeEquipment, activeFlows, alerts };
}

/**
 * Find events near a given time (within windowMs).
 * Used for visual effects — pulse, burst, flash.
 */
export function getRecentEvents(
  events: ProductionEvent[],
  atTime: number,
  windowMs = 5000,
): ProductionEvent[] {
  return events.filter((e) => e.timestamp <= atTime && e.timestamp > atTime - windowMs);
}
