"use client";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatters";
import { formatUZS } from "@/lib/attendance/format-hours";
import { Users, Wallet, Clock, Sparkles, AlertTriangle } from "lucide-react";

interface FilterSummaryProps {
  count: number;
  totalCount: number;
  totalFee: number;
  avgFee: number;
  avgLateMin: number;
  cleanCount: number;
  hasFeesCount: number;
}

export function FilterSummary({
  count,
  totalCount,
  totalFee,
  avgFee,
  avgLateMin,
  cleanCount,
  hasFeesCount,
}: FilterSummaryProps) {
  const t = useTranslations("attendance");
  const cleanPct = count > 0 ? Math.round((cleanCount / count) * 100) : 0;
  const issuesPct = count > 0 ? Math.round((hasFeesCount / count) * 100) : 0;

  return (
    <div className="sticky top-0 z-10 -mx-6 mb-3 border-b border-zinc-200 bg-white/80 px-6 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-5">
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label={t("employees.summary.headcount")}
          value={`${formatNumber(count, 0)} / ${formatNumber(totalCount, 0)}`}
          tone="default"
        />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label={t("employees.summary.totalFee")}
          value={formatUZS(totalFee)}
          tone={totalFee > 0 ? "rose" : "default"}
        />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label={t("employees.summary.avgFee")}
          value={formatUZS(Math.round(avgFee))}
          tone="default"
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label={t("employees.summary.avgLate")}
          value={`${formatNumber(Math.round(avgLateMin), 0)} ${t("table.late")
            .replace(/\(.*\)/, "")
            .trim()}`}
          tone={avgLateMin > 15 ? "amber" : "default"}
        />
        <Stat
          icon={
            cleanPct >= 50 ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )
          }
          label={t("employees.summary.cleanPct")}
          value={`${cleanPct}% · ${issuesPct}% ⚠`}
          tone={cleanPct >= 70 ? "emerald" : cleanPct >= 40 ? "amber" : "rose"}
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
  tone: "default" | "emerald" | "amber" | "rose";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "rose"
          ? "text-rose-600 dark:text-rose-400"
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
