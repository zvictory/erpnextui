"use client";

interface DayColumnBarProps {
  k: number;
  y: number;
  n: number;
  d: number;
  total: number;
}

export function DayColumnBar({ k, y, n, d, total }: DayColumnBarProps) {
  if (total <= 0) {
    return <div className="h-[6px] w-full rounded-sm bg-zinc-100 dark:bg-zinc-800" />;
  }
  const kPct = (k / total) * 100;
  const yPct = (y / total) * 100;
  const nPct = (n / total) * 100;
  const dPct = (d / total) * 100;
  return (
    <div
      className="flex h-[6px] w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800"
      title={`K=${k} · Y=${y} · ?=${n} · D=${d}`}
    >
      {kPct > 0 && (
        <div className="bg-emerald-500 dark:bg-emerald-400" style={{ width: `${kPct}%` }} />
      )}
      {yPct > 0 && (
        <div className="bg-amber-500 dark:bg-amber-400" style={{ width: `${yPct}%` }} />
      )}
      {nPct > 0 && (
        <div className="bg-fuchsia-500 dark:bg-fuchsia-400" style={{ width: `${nPct}%` }} />
      )}
      {dPct > 0 && (
        <div className="bg-rose-400/70 dark:bg-rose-400/60" style={{ width: `${dPct}%` }} />
      )}
    </div>
  );
}
