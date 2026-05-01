"use client";
import { useTranslations } from "next-intl";
import { formatUZS } from "@/lib/attendance/format-hours";

interface PayrollWaterfallProps {
  earnedSalaryUZS: number;
  overtimeUZS: number;
  transportUZS: number;
  feesUZS: number;
  netUZS: number;
}

export function PayrollWaterfall({
  earnedSalaryUZS,
  overtimeUZS,
  transportUZS,
  feesUZS,
  netUZS,
}: PayrollWaterfallProps) {
  const t = useTranslations("attendance");
  const grossPlusFees = earnedSalaryUZS + overtimeUZS + transportUZS + feesUZS;
  const denom = grossPlusFees > 0 ? grossPlusFees : 1;
  const seg = (v: number) => `${(v / denom) * 100}%`;
  return (
    <div className="space-y-2">
      <div className="flex h-9 w-full overflow-hidden rounded-md ring-1 ring-zinc-200 dark:ring-zinc-800">
        {earnedSalaryUZS > 0 && (
          <div
            className="flex items-center justify-center bg-cyan-500 text-[10px] font-semibold text-white"
            style={{ width: seg(earnedSalaryUZS) }}
            title={`${t("payroll.earnedSalary")}: ${formatUZS(earnedSalaryUZS)}`}
          >
            {earnedSalaryUZS / denom > 0.08 ? formatUZS(earnedSalaryUZS) : ""}
          </div>
        )}
        {overtimeUZS > 0 && (
          <div
            className="flex items-center justify-center bg-emerald-500 text-[10px] font-semibold text-white"
            style={{ width: seg(overtimeUZS) }}
            title={`${t("payroll.overtime")}: ${formatUZS(overtimeUZS)}`}
          >
            {overtimeUZS / denom > 0.08 ? formatUZS(overtimeUZS) : ""}
          </div>
        )}
        {transportUZS > 0 && (
          <div
            className="flex items-center justify-center bg-indigo-500 text-[10px] font-semibold text-white"
            style={{ width: seg(transportUZS) }}
            title={`${t("payroll.transport")}: ${formatUZS(transportUZS)}`}
          >
            {transportUZS / denom > 0.08 ? formatUZS(transportUZS) : ""}
          </div>
        )}
        {feesUZS > 0 && (
          <div
            className="flex items-center justify-center bg-rose-500 text-[10px] font-semibold text-white"
            style={{ width: seg(feesUZS) }}
            title={`${t("payroll.fees")}: −${formatUZS(feesUZS)}`}
          >
            {feesUZS / denom > 0.08 ? `−${formatUZS(feesUZS)}` : ""}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
        <Legend cls="bg-cyan-500" label={t("payroll.earnedSalary")} />
        <Legend cls="bg-emerald-500" label={t("payroll.overtime")} />
        <Legend cls="bg-indigo-500" label={t("payroll.transport")} />
        <Legend cls="bg-rose-500" label={t("payroll.fees")} />
        <span className="ml-auto font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          → {t("payroll.net")}: {formatUZS(netUZS)}
        </span>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${cls}`} />
      {label}
    </span>
  );
}
