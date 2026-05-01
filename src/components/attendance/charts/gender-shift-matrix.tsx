"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { GenderShiftCell } from "@/lib/attendance/aggregates";
import type { ShiftKind } from "@/lib/attendance/state-machine";

const SHIFTS: ShiftKind[] = ["day", "night", "office", "light", "flexible", "remote"];

function intensity(value: number, max: number): string {
  if (max === 0 || value === 0)
    return "bg-zinc-50 text-zinc-400 dark:bg-zinc-800/40 dark:text-zinc-600";
  const r = value / max;
  if (r <= 0.2) return "bg-cyan-50 text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-200";
  if (r <= 0.4) return "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/20 dark:text-cyan-100";
  if (r <= 0.6) return "bg-cyan-200 text-cyan-950 dark:bg-cyan-500/30 dark:text-cyan-50";
  if (r <= 0.8) return "bg-cyan-300 text-cyan-950 dark:bg-cyan-500/45 dark:text-cyan-50";
  return "bg-cyan-500 text-white dark:bg-cyan-500/70 dark:text-white";
}

export function GenderShiftMatrix({ cells }: { cells: GenderShiftCell[] }) {
  const t = useTranslations("attendance");
  const max = useMemo(() => Math.max(0, ...cells.map((c) => c.count)), [cells]);
  const byKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(`${c.gender}-${c.shift}`, c.count);
    return m;
  }, [cells]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase tracking-wide text-zinc-400" />
            {SHIFTS.map((s) => (
              <th
                key={s}
                className="px-1 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500"
              >
                {t(`shift.${s}`).split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["m", "f"] as const).map((g) => (
            <tr key={g}>
              <td className="pr-2 text-right text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                {g === "m" ? t("dashboard.men") : t("dashboard.women")}
              </td>
              {SHIFTS.map((s) => {
                const v = byKey.get(`${g}-${s}`) ?? 0;
                return (
                  <td key={s}>
                    <div
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md text-[12px] font-semibold tabular-nums",
                        intensity(v, max),
                      )}
                      title={`${t(`shift.${s}`)} · ${
                        g === "m" ? t("dashboard.men") : t("dashboard.women")
                      }: ${v}`}
                    >
                      {v}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
