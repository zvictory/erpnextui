"use client";

interface SalaryPipProps {
  /** Position of this salary along the catalog range, 0..1. */
  ratio: number;
}

export function SalaryPip({ ratio }: SalaryPipProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <div className="relative h-1 w-20 overflow-hidden rounded-full bg-gradient-to-r from-zinc-200 via-cyan-200 to-emerald-300 dark:from-zinc-700 dark:via-cyan-500/30 dark:to-emerald-500/40">
      <div
        className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-sm bg-zinc-900 shadow-sm dark:bg-zinc-50"
        style={{ left: `calc(${clamped * 100}% - 1px)` }}
      />
    </div>
  );
}
