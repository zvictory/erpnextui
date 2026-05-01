"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useMemo } from "react";
import type { ArrivalBin } from "@/lib/attendance/aggregates";

interface ArrivalHistogramProps {
  bins: ArrivalBin[];
  expectedMin: number;
  graceMin: number;
}

function fmt(min: number): string {
  const h = ((Math.floor(min / 60) % 24) + 24) % 24;
  const m = ((min % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function ArrivalHistogram({ bins, expectedMin, graceMin }: ArrivalHistogramProps) {
  const data = useMemo(
    () => bins.map((b) => ({ ...b, onTime: b.count - b.late })),
    [bins],
  );
  const graceEnd = expectedMin + graceMin;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-zinc-200 dark:stroke-zinc-800"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval={2}
            className="fill-zinc-500"
          />
          <YAxis tick={{ fontSize: 10 }} className="fill-zinc-500" allowDecimals={false} />
          <ReferenceArea
            x1={fmt(expectedMin)}
            x2={fmt(graceEnd)}
            strokeOpacity={0}
            className="fill-emerald-400/15 dark:fill-emerald-500/20"
          />
          <Tooltip
            cursor={{ className: "fill-zinc-200/40 dark:fill-zinc-700/40" }}
            contentStyle={{
              background: "rgb(24 24 27 / 0.95)",
              border: "1px solid rgb(63 63 70)",
              borderRadius: 8,
              fontSize: 12,
              color: "white",
            }}
            labelStyle={{ color: "rgb(212 212 216)" }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                className={
                  d.late > d.onTime
                    ? "fill-rose-400 dark:fill-rose-500"
                    : "fill-cyan-400 dark:fill-cyan-500"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
