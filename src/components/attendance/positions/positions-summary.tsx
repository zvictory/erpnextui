"use client";
import { useTranslations } from "next-intl";
import { formatUZS } from "@/lib/attendance/format-hours";
import { formatNumber } from "@/lib/formatters";
import { Briefcase, Users, Wallet, Sparkles, Wand2 } from "lucide-react";

interface PositionsSummaryProps {
  positionCount: number;
  headcount: number;
  customizedCount: number;
  avgSalaryUZS: number;
  monthlyPayrollUZS: number;
}

export function PositionsSummary({
  positionCount,
  headcount,
  customizedCount,
  avgSalaryUZS,
  monthlyPayrollUZS,
}: PositionsSummaryProps) {
  const t = useTranslations("attendance");
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-1 border-b border-zinc-200 bg-white/80 px-6 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 print:hidden dark:border-zinc-800 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-5">
        <Stat
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label={t("positions.summary.positions")}
          value={formatNumber(positionCount, 0)}
          tone="default"
        />
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label={t("positions.summary.headcount")}
          value={formatNumber(headcount, 0)}
          tone="default"
        />
        <Stat
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label={t("positions.summary.customized")}
          value={formatNumber(customizedCount, 0)}
          tone={customizedCount > 0 ? "cyan" : "default"}
        />
        <Stat
          icon={<Wand2 className="h-3.5 w-3.5" />}
          label={t("positions.summary.avgSalary")}
          value={formatUZS(avgSalaryUZS)}
          tone="emerald"
        />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label={t("positions.summary.monthlyPayroll")}
          value={formatUZS(monthlyPayrollUZS)}
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
  tone: "default" | "emerald" | "cyan";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
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
