"use client";
import { useTranslations } from "next-intl";
import type { StajTier } from "@/lib/attendance/state-machine";

interface StajLadderProps {
  tiers: StajTier[];
}

export function StajLadder({ tiers }: StajLadderProps) {
  const t = useTranslations("attendance");
  if (tiers.length === 0) return null;
  const maxPct = Math.max(...tiers.map((x) => x.pct), 0.5);
  return (
    <div className="space-y-1.5">
      {tiers.map((tier, i) => {
        const next = tiers[i + 1];
        const range = next ? `${tier.minYears}–${next.minYears - 1}` : `${tier.minYears}+`;
        const w = (tier.pct / maxPct) * 100;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-zinc-500 dark:text-zinc-400 tabular-nums">
              {range} {t("policies.summary.yearsShort")}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500"
                style={{ width: `${w}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              +{Math.round(tier.pct * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
