"use client";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatUZS } from "@/lib/attendance/format-hours";

export interface DeptRow {
  name: string;
  emps: number;
  hours: number;
  fee: number;
  avgLatePerEmp: number;
}

interface DeptLeaderboardProps {
  rows: DeptRow[];
}

function fillForLate(min: number): string {
  if (min <= 5) return "fill-cyan-400 dark:fill-cyan-500";
  if (min <= 15) return "fill-amber-400 dark:fill-amber-500";
  if (min <= 30) return "fill-orange-500 dark:fill-orange-500";
  return "fill-rose-500 dark:fill-rose-500";
}

export function DeptLeaderboard({ rows }: DeptLeaderboardProps) {
  const data = useMemo(
    () => rows.slice(0, 10).map((r) => ({ ...r, label: r.name || "—" })),
    [rows],
  );
  const height = Math.max(200, data.length * 32 + 40);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis type="number" tick={{ fontSize: 10 }} className="fill-zinc-500" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fontSize: 11 }}
            className="fill-zinc-600 dark:fill-zinc-300"
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
            formatter={(_v, _n, item) => {
              const p = item.payload as DeptRow;
              return [
                `${formatUZS(p.fee)} · ${Math.round(p.avgLatePerEmp)} min/emp · ${p.emps} emps`,
                p.name || "—",
              ];
            }}
          />
          <Bar dataKey="fee" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((d, i) => (
              <Cell key={i} className={fillForLate(d.avgLatePerEmp)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
