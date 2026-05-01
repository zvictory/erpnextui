"use client";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatters";
import { formatUZS } from "@/lib/attendance/format-hours";
import { Users, Wallet, Clock, Sparkles, CircleDashed } from "lucide-react";

interface TabelSummaryProps {
  count: number;
  totalCount: number;
  totalFee: number;
  lateIncidents: number;
  cleanCount: number;
  halfDays: number;
}

export function TabelSummary({
  count,
  totalCount,
  totalFee,
  lateIncidents,
  cleanCount,
  halfDays,
}: TabelSummaryProps) {
  const t = useTranslations("attendance");
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-1 border-b border-zinc-200 bg-white/80 px-6 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 print:hidden dark:border-zinc-800 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-5">
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label={t("tabel.summary.headcount")}
          value={`${formatNumber(count, 0)} / ${formatNumber(totalCount, 0)}`}
          tone="default"
        />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label={t("tabel.summary.totalFee")}
          value={formatUZS(totalFee)}
          tone={totalFee > 0 ? "rose" : "default"}
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label={t("tabel.summary.lateIncidents")}
          value={formatNumber(lateIncidents, 0)}
          tone={lateIncidents > 0 ? "amber" : "default"}
        />
        <Stat
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label={t("tabel.summary.clean")}
          value={`${formatNumber(cleanCount, 0)}${
            count > 0 ? ` · ${Math.round((cleanCount / count) * 100)}%` : ""
          }`}
          tone="emerald"
        />
        <Stat
          icon={<CircleDashed className="h-3.5 w-3.5" />}
          label={t("tabel.summary.halfDays")}
          value={formatNumber(halfDays, 0)}
          tone="default"
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
