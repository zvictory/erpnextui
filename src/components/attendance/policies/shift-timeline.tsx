"use client";
import type { ShiftDef } from "@/lib/attendance/state-machine";

interface ShiftTimelineProps {
  def: ShiftDef;
  label: string;
}

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export function ShiftTimeline({ def, label }: ShiftTimelineProps) {
  const startMin = def.startH * 60 + def.startM;
  const lengthMin = def.lengthMin;
  const endMin = (startMin + lengthMin) % (24 * 60);
  const anchorMin = def.halfDayAnchorH * 60;
  const wraps = startMin + lengthMin > 24 * 60;

  const startPct = (startMin / (24 * 60)) * 100;
  const endPct = (endMin / (24 * 60)) * 100;
  const anchorPct = (anchorMin / (24 * 60)) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-zinc-600 dark:text-zinc-300">{label}</span>
      <div className="relative h-6 flex-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60">
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute inset-y-0 w-px bg-zinc-200/80 dark:bg-zinc-700/60"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
        {wraps ? (
          <>
            <div
              className="absolute inset-y-1 rounded-l-sm bg-cyan-400/70 dark:bg-cyan-500/60"
              style={{ left: `${startPct}%`, right: 0 }}
              title={label}
            />
            <div
              className="absolute inset-y-1 rounded-r-sm bg-cyan-400/70 dark:bg-cyan-500/60"
              style={{ left: 0, width: `${endPct}%` }}
            />
          </>
        ) : (
          <div
            className="absolute inset-y-1 rounded-sm bg-cyan-400/70 dark:bg-cyan-500/60"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
            title={label}
          />
        )}
        <div
          className="absolute inset-y-0 w-0.5 bg-amber-500 dark:bg-amber-400"
          style={{ left: `calc(${anchorPct}% - 1px)` }}
          title="anchor"
        />
        <div className="pointer-events-none absolute -bottom-4 left-0 text-[9px] text-zinc-400 tabular-nums">
          0
        </div>
        <div className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-zinc-400 tabular-nums">
          12
        </div>
        <div className="pointer-events-none absolute -bottom-4 right-0 text-[9px] text-zinc-400 tabular-nums">
          24
        </div>
      </div>
      <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
        {Math.round(lengthMin / 60)}h
      </span>
    </div>
  );
}
