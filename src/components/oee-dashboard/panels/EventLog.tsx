"use client";

import { useMemo } from "react";
import {
  Factory,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  StopCircle,
} from "lucide-react";
import { useFactoryTwinStore } from "@/stores/factory-twin-store";
import type { ProductionEvent } from "@/types/factory-twin";

const EVENT_ICONS: Record<ProductionEvent["type"], React.ComponentType<{ className?: string }>> = {
  wo_start: PlayCircle,
  wo_complete: StopCircle,
  manufacture: Factory,
  transfer: ArrowRightLeft,
  quality_pass: CheckCircle2,
  quality_fail: AlertTriangle,
};

const EVENT_COLORS: Record<ProductionEvent["type"], string> = {
  wo_start: "text-yellow-500",
  wo_complete: "text-blue-500",
  manufacture: "text-green-500",
  transfer: "text-blue-400",
  quality_pass: "text-green-400",
  quality_fail: "text-red-500",
};

function formatEventTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EventLog() {
  const { events, currentTime } = useFactoryTwinStore();

  // Show events up to current playback time, reversed (newest first)
  const visibleEvents = useMemo(
    () =>
      events
        .filter((e) => e.timestamp <= currentTime)
        .reverse()
        .slice(0, 50),
    [events, currentTime],
  );

  if (visibleEvents.length === 0) {
    return <div className="text-xs text-white/40 text-center py-4">No events yet</div>;
  }

  return (
    <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
      {visibleEvents.map((event, i) => {
        const Icon = EVENT_ICONS[event.type];
        const colorClass = EVENT_COLORS[event.type];
        const isRecent = currentTime - event.timestamp < 3000;

        return (
          <div
            key={`${event.timestamp}-${i}`}
            className={`flex items-start gap-2 px-2 py-1.5 rounded text-[11px] transition-colors ${
              isRecent ? "bg-white/10" : ""
            }`}
          >
            <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${colorClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-white/50">{formatEventTime(event.timestamp)}</span>
                <span className="font-mono text-white/30">{event.equipmentId}</span>
              </div>
              <p className="text-white/80 truncate">{event.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
