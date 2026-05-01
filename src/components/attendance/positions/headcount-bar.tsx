"use client";

interface HeadcountBarProps {
  count: number;
  max: number;
}

export function HeadcountBar({ count, max }: HeadcountBarProps) {
  const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 dark:from-cyan-400 dark:to-indigo-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{count}</span>
    </div>
  );
}
