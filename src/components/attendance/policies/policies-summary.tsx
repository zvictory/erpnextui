"use client";
import { useTranslations } from "next-intl";
import { formatUZS } from "@/lib/attendance/format-hours";
import { formatNumber } from "@/lib/formatters";
import { Clock, Coins, ShieldAlert, CalendarRange, Wallet } from "lucide-react";

interface PoliciesSummaryProps {
  graceMin: number;
  flatFeeUZS: number;
  dailyCapUZS: number;
  halfDayHours: number;
  feeBudgetUZS: number;
}

export function PoliciesSummary({
  graceMin,
  flatFeeUZS,
  dailyCapUZS,
  halfDayHours,
  feeBudgetUZS,
}: PoliciesSummaryProps) {
  const t = useTranslations("attendance");
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-1 border-b border-zinc-200 bg-white/80 px-6 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 print:hidden dark:border-zinc-800 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-5">
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label={t("policies.summary.grace")}
          value={`${formatNumber(graceMin, 0)} ${t("policies.summary.minShort")}`}
          tone="cyan"
        />
        <Stat
          icon={<Coins className="h-3.5 w-3.5" />}
          label={t("policies.summary.flatFee")}
          value={formatUZS(flatFeeUZS)}
          tone="amber"
        />
        <Stat
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label={t("policies.summary.dailyCap")}
          value={formatUZS(dailyCapUZS)}
          tone="rose"
        />
        <Stat
          icon={<CalendarRange className="h-3.5 w-3.5" />}
          label={t("policies.summary.halfDay")}
          value={`${formatNumber(halfDayHours, 0)} ${t("policies.summary.hShort")}`}
          tone="default"
        />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label={t("policies.summary.feeBudget")}
          value={formatUZS(feeBudgetUZS)}
          tone="emerald"
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "default" | "cyan" | "amber" | "rose" | "emerald";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : tone === "cyan"
            ? "text-cyan-600 dark:text-cyan-400"
            : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className={`truncate text-sm font-semibold tabular-nums ${toneCls}`}>{value}</div>
      </div>
    </div>
  );
}
