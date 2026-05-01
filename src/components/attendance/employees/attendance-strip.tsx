"use client";
import type { MonthlyStats } from "@/lib/attendance/data";
import type { DayStatus } from "@/lib/attendance/state-machine";
import { formatNumber } from "@/lib/formatters";

const FILL: Record<DayStatus, string> = {
  present: "fill-emerald-500 dark:fill-emerald-400",
  late_flat: "fill-amber-500 dark:fill-amber-400",
  late_step: "fill-orange-500 dark:fill-orange-400",
  half_day: "fill-indigo-500 dark:fill-indigo-400",
  absent: "fill-rose-500/80 dark:fill-rose-400/80",
  incomplete: "fill-fuchsia-500 dark:fill-fuchsia-400",
  weekend: "fill-zinc-200 dark:fill-zinc-700",
  holiday: "fill-sky-400 dark:fill-sky-400",
};

interface AttendanceStripProps {
  perDay: MonthlyStats["perDay"];
  size?: "sm" | "md";
  cellWidth?: number;
  gap?: number;
}

export function AttendanceStrip({
  perDay,
  size = "sm",
  cellWidth,
  gap,
}: AttendanceStripProps) {
  const w = cellWidth ?? (size === "md" ? 8 : 6);
  const g = gap ?? 1.5;
  const h = size === "md" ? 14 : 10;
  const total = perDay.length;
  const totalW = total * w + (total - 1) * g;

  return (
    <svg
      width={totalW}
      height={h}
      viewBox={`0 0 ${totalW} ${h}`}
      className="overflow-visible"
      role="img"
      aria-label="Monthly attendance fingerprint"
    >
      {perDay.map((p, i) => {
        const x = i * (w + g);
        const status = p.result.status;
        return (
          <rect
            key={p.day.d}
            x={x}
            y={0}
            width={w}
            height={h}
            rx={1.5}
            ry={1.5}
            className={FILL[status]}
          >
            <title>
              {`${p.day.d}: ${status}${p.result.lateMin ? ` · ${p.result.lateMin}m late` : ""}${
                p.result.feeUZS
                  ? ` · ${formatNumber(p.result.feeUZS, 0)} сўм`
                  : ""
              }`}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
