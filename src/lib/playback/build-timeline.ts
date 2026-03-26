import type { ProductionEvent } from "@/types/factory-twin";
import type { ActiveWorkOrder, RecentStockEntry } from "@/hooks/use-factory-twin";
import { FACTORY_LAYOUT, PIPE_NETWORK } from "@/config/factory-layout";

/** Find equipment ID from a workstation name */
function equipmentForWorkstation(ws: string): string | undefined {
  return FACTORY_LAYOUT.find((e) => e.linkedWorkstation === ws)?.id;
}

/** Find equipment ID from a warehouse name */
function equipmentForWarehouse(wh: string): string | undefined {
  return FACTORY_LAYOUT.find((e) => e.linkedWarehouse === wh)?.id;
}

/** Find pipe connecting two equipment IDs */
function findPipe(fromEq: string, toEq: string): string | undefined {
  return PIPE_NETWORK.find((p) => p.from === fromEq || p.to === toEq)?.id;
}

/** Parse ERPNext date + time strings to unix ms */
function toTimestamp(date: string, time?: string): number {
  const t = time ? `${date}T${time}` : date;
  return new Date(t).getTime();
}

/**
 * Merge Work Orders and Stock Entries into a sorted timeline of ProductionEvents.
 */
export function buildTimeline(
  workOrders: ActiveWorkOrder[],
  stockEntries: RecentStockEntry[],
): ProductionEvent[] {
  const events: ProductionEvent[] = [];

  // Work Orders → wo_start events
  for (const wo of workOrders) {
    const eqId = equipmentForWorkstation(wo.workstation);
    if (!eqId) continue;

    if (wo.status === "In Process") {
      events.push({
        timestamp: toTimestamp(wo.expected_delivery_date || new Date().toISOString().slice(0, 10)),
        type: "wo_start",
        equipmentId: eqId,
        label: `${wo.item_name || wo.production_item} — ${wo.produced_qty}/${wo.qty}`,
        data: { workOrder: wo.name, item: wo.production_item, qty: wo.qty, produced: wo.produced_qty },
      });
    }
  }

  // Stock Entries → manufacture / transfer events
  for (const se of stockEntries) {
    const ts = toTimestamp(se.posting_date, se.posting_time);

    if (se.purpose === "Manufacture") {
      const eqId = se.work_order
        ? workOrders.find((w) => w.name === se.work_order)?.workstation
          ? equipmentForWorkstation(workOrders.find((w) => w.name === se.work_order)!.workstation)
          : undefined
        : undefined;
      events.push({
        timestamp: ts,
        type: "manufacture",
        equipmentId: eqId || "L-101",
        label: `Manufacture: ${se.name}`,
        data: { stockEntry: se.name, value: se.total_incoming_value },
      });
    }

    if (se.purpose === "Material Transfer") {
      const fromEq = equipmentForWarehouse(se.from_warehouse) || "WH-01";
      const toEq = equipmentForWarehouse(se.to_warehouse) || "WH-01";
      const pipeId = findPipe(fromEq, toEq);
      events.push({
        timestamp: ts,
        type: "transfer",
        equipmentId: fromEq,
        pipeId,
        label: `Transfer: ${se.from_warehouse} → ${se.to_warehouse}`,
        data: { stockEntry: se.name, from: se.from_warehouse, to: se.to_warehouse },
      });
    }
  }

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}
