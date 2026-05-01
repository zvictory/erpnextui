"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatUZS } from "@/lib/attendance/format-hours";
import type { RegionTotal } from "@/lib/attendance/aggregates";

const COLORS: Record<RegionTotal["region"], string> = {
  city: "bg-cyan-500 dark:bg-cyan-400",
  district: "bg-indigo-500 dark:bg-indigo-400",
  farDistrict: "bg-fuchsia-500 dark:bg-fuchsia-400",
};

interface RegionBarProps {
  totals: RegionTotal[];
}

export function RegionBar({ totals }: RegionBarProps) {
  const t = useTranslations("attendance");
  const grand = useMemo(() => totals.reduce((a, r) => a + r.uzs, 0), [totals]);

  return (
    <div>
      <div className="flex h-7 overflow-hidden rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-700">
        {totals.map((r) => {
          const pct = grand > 0 ? (r.uzs / grand) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={r.region}
              style={{ width: `${pct}%` }}
              className={`${COLORS[r.region]} flex items-center justify-center text-[10px] font-semibold text-white`}
              title={`${t(`region.${r.region}`)}: ${formatUZS(r.uzs)} (${Math.round(pct)}%)`}
            >
              {pct >= 8 ? `${Math.round(pct)}%` : ""}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 space-y-1.5 text-xs">
        {totals.map((r) => (
          <li key={r.region} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${COLORS[r.region]}`} />
              <span className="text-zinc-600 dark:text-zinc-300">
                {t(`region.${r.region}`)}
              </span>
              <span className="text-zinc-400">· {r.employees}</span>
            </span>
            <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatUZS(r.uzs)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t border-zinc-200 pt-1.5 text-[11px] font-medium dark:border-zinc-800">
          <span className="text-zinc-500">Σ</span>
          <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatUZS(grand)}
          </span>
        </li>
      </ul>
    </div>
  );
}
