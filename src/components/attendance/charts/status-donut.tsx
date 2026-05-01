"use client";
import { useMemo } from "react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
  Tooltip,
} from "recharts";
import { useTranslations } from "next-intl";
import type { StatusMixSlice } from "@/lib/attendance/aggregates";

const RING_HEX: Record<StatusMixSlice["key"], string> = {
  present: "#10b981",
  late_flat: "#f59e0b",
  late_step: "#f97316",
  half_day: "#6366f1",
  absent: "#71717a",
  incomplete: "#d946ef",
};

interface StatusDonutProps {
  slices: StatusMixSlice[];
}

export function StatusDonut({ slices }: StatusDonutProps) {
  const t = useTranslations("attendance");
  const total = useMemo(() => slices.reduce((a, s) => a + s.count, 0), [slices]);
  const data = useMemo(
    () =>
      slices.map((s) => ({
        name: t(`status.${s.key}`),
        key: s.key,
        value: s.count,
        pct: total > 0 ? s.count / total : 0,
        fill: RING_HEX[s.key],
      })),
    [slices, total, t],
  );

  return (
    <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-2">
      <div className="relative h-56">
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="38%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, total || 1]} tick={false} />
            <RadialBar
              background={{ className: "fill-zinc-100 dark:fill-zinc-800/60" }}
              dataKey="value"
              cornerRadius={6}
            />
            <Tooltip
              contentStyle={{
                background: "rgb(24 24 27 / 0.95)",
                border: "1px solid rgb(63 63 70)",
                borderRadius: 8,
                fontSize: 12,
                color: "white",
              }}
              formatter={(value, _name, item) => [
                `${value} (${Math.round(((item.payload as { pct: number }).pct) * 100)}%)`,
                (item.payload as { name: string }).name,
              ]}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{total}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            {t("dashboard.totalEvents")}
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: d.fill }}
              />
              <span className="text-zinc-600 dark:text-zinc-300">{d.name}</span>
            </span>
            <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
              {d.value} <span className="text-zinc-400">· {Math.round(d.pct * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
