"use client";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatters";
import { formatUZS } from "@/lib/attendance/format-hours";
import { AvatarPill } from "@/components/attendance/employees/avatar-pill";
import { Wallet, TrendingUp, Bus, ShieldAlert, BadgeDollarSign } from "lucide-react";

interface PayrollSummaryProps {
  employeeName: string | null;
  position: string | null;
  earnedSalaryUZS: number;
  overtimeUZS: number;
  transportUZS: number;
  feesUZS: number;
  netUZS: number;
  attendancePct: number;
}

export function PayrollSummary({
  employeeName,
  position,
  earnedSalaryUZS,
  overtimeUZS,
  transportUZS,
  feesUZS,
  netUZS,
  attendancePct,
}: PayrollSummaryProps) {
  const t = useTranslations("attendance");
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-1 border-b border-zinc-200 bg-white/80 px-6 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 print:hidden dark:border-zinc-800 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="flex flex-wrap items-center gap-4">
        {employeeName ? (
          <div className="flex min-w-0 items-center gap-2">
            <AvatarPill name={employeeName} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {employeeName}
              </div>
              <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {position ?? t("payroll.standalone")}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("payroll.standalone")}
          </div>
        )}
        <div className="ml-auto grid grow grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-5">
          <Stat
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t("payroll.earnedSalary")}
            value={formatUZS(earnedSalaryUZS)}
            hint={`${formatNumber(attendancePct, 0)}%`}
            tone="default"
          />
          <Stat
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("payroll.overtime")}
            value={formatUZS(overtimeUZS)}
            tone={overtimeUZS > 0 ? "emerald" : "default"}
          />
          <Stat
            icon={<Bus className="h-3.5 w-3.5" />}
            label={t("payroll.transport")}
            value={formatUZS(transportUZS)}
            tone={transportUZS > 0 ? "cyan" : "default"}
          />
          <Stat
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            label={t("payroll.fees")}
            value={feesUZS > 0 ? `−${formatUZS(feesUZS)}` : "—"}
            tone={feesUZS > 0 ? "rose" : "default"}
          />
          <Stat
            icon={<BadgeDollarSign className="h-3.5 w-3.5" />}
            label={t("payroll.net")}
            value={formatUZS(netUZS)}
            tone="emerald"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "default" | "emerald" | "cyan" | "rose";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "cyan"
        ? "text-cyan-600 dark:text-cyan-400"
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
          {hint ? <span className="ml-1 text-zinc-400">· {hint}</span> : null}
        </div>
        <div className={`truncate text-sm font-semibold tabular-nums ${toneCls}`}>{value}</div>
      </div>
    </div>
  );
}
