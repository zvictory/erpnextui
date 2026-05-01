"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { computePayroll, stajBonusPct } from "@/lib/attendance/payroll";
import { formatUZS } from "@/lib/attendance/format-hours";
import { formatNumber } from "@/lib/formatters";
import { usePolicy } from "@/stores/attendance/policy-store";
import { useEmployeeStore } from "@/stores/attendance/employee-overrides-store";
import { usePositionSalary } from "@/lib/attendance/positions";
import type { Employee, MonthlyStats } from "@/lib/attendance/data";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 " +
  "border-zinc-300 bg-white text-zinc-900 focus:border-cyan-500 focus:ring-cyan-500/20 " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const SCHEDULED_DAYS_DEFAULT = 26;
const OT_COEFFICIENT_DEFAULT = 1.25;
const NIGHT_OT_PREMIUM = 1.1;

export function PayrollCard({ emp, month }: { emp: Employee; month: MonthlyStats }) {
  const t = useTranslations("attendance");
  const policy = usePolicy();
  const setEmployeeField = useEmployeeStore((s) => s.setEmployeeField);
  const positionSalary = usePositionSalary(emp.position);

  const def = policy.shifts[emp.shift];
  const shiftHours = def.lengthMin / 60;
  const stajPct = stajBonusPct(emp.stajYears, policy.stajTiers);
  const hourlyRate = positionSalary / (SCHEDULED_DAYS_DEFAULT * shiftHours);
  const otHours = emp.overtimeMin / 60;
  const isNightOT = emp.shift === "night";
  const transportRate = policy.regionRatesUZS[emp.region];
  const transportDays = month.fullDays + month.halfDays * 0.5;

  const result = useMemo(
    () =>
      computePayroll({
        basePositionSalaryUZS: positionSalary,
        stajYears: emp.stajYears,
        daysWorked: month.fullDays,
        halfDays: month.halfDays,
        scheduledDays: SCHEDULED_DAYS_DEFAULT,
        overtimeMinutes: emp.overtimeMin,
        overtimeCoefficient: OT_COEFFICIENT_DEFAULT,
        isNightOT,
        hourlyRateUZS: hourlyRate,
        feesUZS: month.feeUZS,
        stajTiers: policy.stajTiers,
        transportRateUZS: transportRate,
        transportDays,
      }),
    [
      positionSalary,
      emp.stajYears,
      emp.overtimeMin,
      isNightOT,
      hourlyRate,
      month.fullDays,
      month.halfDays,
      month.feeUZS,
      policy.stajTiers,
      transportRate,
      transportDays,
    ],
  );

  const effectiveDays = month.fullDays + month.halfDays * 0.5;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {t("payroll.cardTitle")}
          </div>
          <label className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              {t("payroll.overtimeMin")}
            </span>
            <input
              type="number"
              min={0}
              value={emp.overtimeMin}
              onChange={(e) =>
                setEmployeeField(emp.id, { overtimeMin: Math.max(0, Number(e.target.value)) })
              }
              className={cn(INPUT_CLS, "w-24")}
            />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <CalcRow
            n={1}
            label={t("payroll.basePosition")}
            formula={emp.position || "—"}
            value={formatUZS(positionSalary)}
          />
          <CalcRow
            n={2}
            label={t("payroll.baseWithStaj")}
            formula={
              <Formula>
                {formatUZS(positionSalary)} × (1 + <Hi>{Math.round(stajPct * 100)}%</Hi>)
                <Dim>
                  {" "}
                  · {emp.stajYears} {t("payroll.stajYears").toLowerCase()}
                </Dim>
              </Formula>
            }
            value={formatUZS(result.baseWithStaj)}
          />
          <CalcRow
            n={3}
            label={t("payroll.attendance")}
            formula={
              <Formula>
                ({month.fullDays} + {month.halfDays} × 0.5) ÷ {SCHEDULED_DAYS_DEFAULT}
                <Dim>
                  {" "}
                  = {formatNumber(effectiveDays, 1)} / {SCHEDULED_DAYS_DEFAULT}
                </Dim>
              </Formula>
            }
            value={`${formatNumber(result.attendanceFactor * 100, 1)}%`}
          />
          <CalcRow
            n={4}
            label={t("payroll.earnedSalary")}
            formula={
              <Formula>
                {formatUZS(result.baseWithStaj)} ×{" "}
                {formatNumber(result.attendanceFactor * 100, 1)}%
              </Formula>
            }
            value={formatUZS(result.earnedSalary)}
            tone="good"
          />
          <CalcRow
            n={5}
            label={t("payroll.overtime")}
            formula={
              emp.overtimeMin > 0 ? (
                <Formula>
                  {formatNumber(otHours, 2)}h × {formatUZS(hourlyRate)}/h × {OT_COEFFICIENT_DEFAULT}
                  {isNightOT ? (
                    <Hi>
                      {" "}
                      × {NIGHT_OT_PREMIUM} (night)
                    </Hi>
                  ) : null}
                  <Dim>
                    {" "}
                    · base/h = {formatUZS(positionSalary)} ÷ ({SCHEDULED_DAYS_DEFAULT}d ×{" "}
                    {shiftHours}h)
                  </Dim>
                </Formula>
              ) : (
                <Dim>—</Dim>
              )
            }
            value={result.overtimeUZS > 0 ? formatUZS(result.overtimeUZS) : "—"}
            tone={result.overtimeUZS > 0 ? "good" : "muted"}
          />
          <CalcRow
            n={6}
            label={t("payroll.transport")}
            formula={
              transportRate > 0 && transportDays > 0 ? (
                <Formula>
                  {formatUZS(transportRate)}/{t("payroll.perDayShort")} ×{" "}
                  {formatNumber(transportDays, 1)}
                  <Dim> · {t(`region.${emp.region}`)}</Dim>
                </Formula>
              ) : (
                <Dim>—</Dim>
              )
            }
            value={result.transportUZS > 0 ? formatUZS(result.transportUZS) : "—"}
            tone={result.transportUZS > 0 ? "good" : "muted"}
          />
          <CalcRow
            n={7}
            label={t("payroll.gross")}
            formula={
              <Formula>
                {formatUZS(result.earnedSalary)}
                {result.overtimeUZS > 0 ? ` + ${formatUZS(result.overtimeUZS)}` : ""}
                {result.transportUZS > 0 ? ` + ${formatUZS(result.transportUZS)}` : ""}
              </Formula>
            }
            value={formatUZS(result.gross)}
          />
          <CalcRow
            n={8}
            label={t("payroll.fees")}
            formula={
              result.feesUZS > 0 ? (
                <Formula>
                  <Dim>{month.lateIncidents} late-fee incident(s)</Dim>
                </Formula>
              ) : (
                <Dim>—</Dim>
              )
            }
            value={result.feesUZS > 0 ? `−${formatUZS(result.feesUZS)}` : "—"}
            tone={result.feesUZS > 0 ? "bad" : "muted"}
          />
          <CalcRow
            n={9}
            label={t("payroll.net")}
            formula={
              <Formula>
                {formatUZS(result.gross)}
                {result.feesUZS > 0 ? ` − ${formatUZS(result.feesUZS)}` : ""}
              </Formula>
            }
            value={formatUZS(result.net)}
            tone="good"
            big
          />
        </div>
      </CardContent>
    </Card>
  );
}

type Tone = "default" | "good" | "bad" | "muted";

function CalcRow({
  n,
  label,
  formula,
  value,
  tone = "default",
  big = false,
}: {
  n: number;
  label: string;
  formula: React.ReactNode;
  value: string;
  tone?: Tone;
  big?: boolean;
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-300"
        : tone === "muted"
          ? "text-zinc-400 dark:text-zinc-600"
          : "text-zinc-900 dark:text-zinc-100";

  return (
    <div
      className={cn(
        "grid grid-cols-[28px_minmax(120px,180px)_1fr_auto] items-baseline gap-3 border-b border-zinc-100 px-3 py-2 last:border-0 dark:border-zinc-800/60",
        big && "bg-emerald-50/40 py-3 dark:bg-emerald-500/5",
      )}
    >
      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">{n}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-xs text-zinc-600 dark:text-zinc-400">{formula}</span>
      <span
        className={cn(
          "text-right font-mono tabular-nums",
          big ? "text-base font-semibold" : "text-sm font-medium",
          toneCls,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-zinc-700 dark:text-zinc-300">{children}</span>;
}

function Dim({ children }: { children: React.ReactNode }) {
  return <span className="text-zinc-400 dark:text-zinc-500">{children}</span>;
}

function Hi({ children }: { children: React.ReactNode }) {
  return <span className="text-cyan-700 dark:text-cyan-300">{children}</span>;
}
