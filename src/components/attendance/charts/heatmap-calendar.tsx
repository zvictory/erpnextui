"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AbsenceByDayPoint } from "@/lib/attendance/aggregates";

interface HeatmapCalendarProps {
  points: AbsenceByDayPoint[];
  weekStart?: 0 | 1;
}

function rampClass(rate: number, scheduled: number): string {
  if (scheduled === 0) {
    return "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/40 dark:text-zinc-600";
  }
  if (rate <= 0.02)
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200";
  if (rate <= 0.05)
    return "bg-emerald-200 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100";
  if (rate <= 0.1) return "bg-amber-200 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100";
  if (rate <= 0.2)
    return "bg-orange-300 text-orange-950 dark:bg-orange-500/40 dark:text-orange-50";
  return "bg-rose-400 text-rose-950 dark:bg-rose-500/60 dark:text-rose-50";
}

export function HeatmapCalendar({ points, weekStart = 1 }: HeatmapCalendarProps) {
  const t = useTranslations("attendance");
  if (!points.length) return null;

  const first = points[0];
  const offset = weekStart === 1 ? (first.dow + 6) % 7 : first.dow;

  const dowKeys =
    weekStart === 1
      ? (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)
      : (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {dowKeys.map((k) => (
          <div key={k}>{t(`dow.${k}`)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {points.map((p) => {
          const cls = rampClass(p.rate, p.scheduled);
          const isWeekend = p.dow === 0 || p.dow === 6;
          const ratePct = `${Math.round(p.rate * 100)}%`;
          return (
            <Link
              key={p.day}
              href={`/employees?view=tabel&day=${p.day}`}
              title={`${p.day} · ${p.absent}/${p.scheduled} (${ratePct})`}
              className={cn(
                "group relative flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold transition-all",
                "hover:scale-110 hover:ring-2 hover:ring-cyan-400 hover:z-10",
                cls,
                isWeekend && "ring-1 ring-zinc-300/50 dark:ring-zinc-700/50",
              )}
            >
              <span>{p.day}</span>
              {p.scheduled > 0 ? (
                <span className="absolute bottom-0.5 right-1 text-[8px] opacity-60">
                  {ratePct}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
        <span>0%</span>
        <div className="flex h-2 flex-1 overflow-hidden rounded-full">
          <div className="flex-1 bg-emerald-100 dark:bg-emerald-500/15" />
          <div className="flex-1 bg-emerald-200 dark:bg-emerald-500/25" />
          <div className="flex-1 bg-amber-200 dark:bg-amber-500/30" />
          <div className="flex-1 bg-orange-300 dark:bg-orange-500/40" />
          <div className="flex-1 bg-rose-400 dark:bg-rose-500/60" />
        </div>
        <span>20%+</span>
      </div>
    </div>
  );
}
