"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEmployees, computeMonth, getDataset } from "@/lib/attendance/data";
import { usePolicy } from "@/stores/attendance/policy-store";
import { STATUS_META } from "@/lib/attendance/state-machine";
import { formatUZS } from "@/lib/attendance/format-hours";
import { formatNumber } from "@/lib/formatters";
import {
  absenceByDay,
  arrivalBins,
  dailySeries,
  genderShiftMatrix,
  regionTransport,
  statusMix,
} from "@/lib/attendance/aggregates";
import { AnimatedKpi } from "@/components/attendance/charts/animated-kpi";
import { HeatmapCalendar } from "@/components/attendance/charts/heatmap-calendar";
import { ArrivalHistogram } from "@/components/attendance/charts/arrival-histogram";
import { StatusDonut } from "@/components/attendance/charts/status-donut";
import { DeptLeaderboard } from "@/components/attendance/charts/dept-leaderboard";
import { GenderShiftMatrix } from "@/components/attendance/charts/gender-shift-matrix";
import { RegionBar } from "@/components/attendance/charts/region-bar";

export function EmployeesDashboardView() {
  const t = useTranslations("attendance");
  const employees = useEmployees();
  const policy = usePolicy();

  const series = useMemo(() => dailySeries(employees, policy), [employees, policy]);
  const heatPoints = useMemo(() => absenceByDay(employees, policy), [employees, policy]);
  const dayBins = useMemo(() => arrivalBins(employees, "day", policy), [employees, policy]);
  const mix = useMemo(() => statusMix(employees, policy), [employees, policy]);
  const matrix = useMemo(() => genderShiftMatrix(employees), [employees]);
  const regions = useMemo(() => regionTransport(employees, policy), [employees, policy]);
  const ds = useMemo(() => getDataset(), []);

  const stats = useMemo(() => {
    let workedMinutes = 0;
    let lateIncidents = 0;
    let lateMinutes = 0;
    let feeUZS = 0;
    let absentDays = 0;
    let halfDays = 0;
    let perfect = 0;

    const offenders: { id: string; name: string; dept: string; fee: number; lateMin: number }[] = [];
    const deptAgg = new Map<string, { hours: number; fee: number; emps: number; lateMin: number }>();

    for (const e of employees) {
      const m = computeMonth(e, policy);
      workedMinutes += m.workedMinutes;
      lateIncidents += m.lateIncidents;
      lateMinutes += m.lateMinutes;
      feeUZS += m.feeUZS;
      absentDays += m.absentDays;
      halfDays += m.halfDays;
      if (
        m.lateIncidents === 0 &&
        m.absentDays === 0 &&
        m.incompleteDays === 0 &&
        m.workedMinutes > 0
      )
        perfect += 1;
      if (m.feeUZS > 0)
        offenders.push({
          id: e.id,
          name: e.name,
          dept: e.dept,
          fee: m.feeUZS,
          lateMin: m.lateMinutes,
        });
      const dept = e.dept || "—";
      const da = deptAgg.get(dept) ?? { hours: 0, fee: 0, emps: 0, lateMin: 0 };
      da.hours += m.workedMinutes / 60;
      da.fee += m.feeUZS;
      da.emps += 1;
      da.lateMin += m.lateMinutes;
      deptAgg.set(dept, da);
    }
    offenders.sort((a, b) => b.fee - a.fee);

    const deptRows = Array.from(deptAgg.entries())
      .map(([name, d]) => ({
        name,
        emps: d.emps,
        hours: d.hours,
        fee: d.fee,
        avgLatePerEmp: d.emps > 0 ? d.lateMin / d.emps : 0,
      }))
      .sort((a, b) => b.fee - a.fee);

    return {
      workedMinutes,
      lateIncidents,
      lateMinutes,
      feeUZS,
      absentDays,
      halfDays,
      perfect,
      offenders: offenders.slice(0, 10),
      deptRows,
    };
  }, [employees, policy]);

  const todayIdx = Math.min(series.length - 1, 14);
  const today = series[todayIdx];
  const lastWeek = series[Math.max(0, todayIdx - 7)];
  const headcountDelta =
    lastWeek && lastWeek.present > 0 ? (today.present - lastWeek.present) / lastWeek.present : 0;

  const hoursMTD = series.slice(0, todayIdx + 1).reduce((a, p) => a + p.hours, 0);
  const hoursPrevWeek = series
    .slice(Math.max(0, todayIdx - 13), Math.max(0, todayIdx - 6))
    .reduce((a, p) => a + p.hours, 0);
  const hoursCurrWeek = series
    .slice(Math.max(0, todayIdx - 6), todayIdx + 1)
    .reduce((a, p) => a + p.hours, 0);
  const hoursDelta = hoursPrevWeek > 0 ? (hoursCurrWeek - hoursPrevWeek) / hoursPrevWeek : 0;

  const feeBudgetPct = policy.feeBudgetUZS > 0 ? stats.feeUZS / policy.feeBudgetUZS : 0;
  const feePacingTone = feeBudgetPct >= 1 ? "bad" : feeBudgetPct >= 0.7 ? "warn" : "good";

  const dayShiftDef = policy.shifts.day;
  const expectedDayMin = dayShiftDef.startH * 60 + dayShiftDef.startM;

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AnimatedKpi
          label={t("dashboard.headcount")}
          value={today?.present ?? 0}
          tone="good"
          delta={headcountDelta}
          deltaLabel={t("dashboard.vsLastWeek")}
          trend={series.slice(Math.max(0, todayIdx - 13), todayIdx + 1).map((p) => p.present)}
        />
        <AnimatedKpi
          label={t("dashboard.hoursMTD")}
          value={Math.round(hoursMTD)}
          suffix="h"
          tone="default"
          delta={hoursDelta}
          deltaLabel={t("dashboard.vsLastWeek")}
          trend={series.slice(Math.max(0, todayIdx - 13), todayIdx + 1).map((p) => p.hours)}
          format="compact"
        />
        <div
          className={
            "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ring-1 " +
            (feePacingTone === "bad"
              ? "from-rose-50 to-white ring-rose-200 dark:from-rose-500/10 dark:to-zinc-900/40 dark:ring-rose-500/30"
              : feePacingTone === "warn"
                ? "from-amber-50 to-white ring-amber-200 dark:from-amber-500/10 dark:to-zinc-900/40 dark:ring-amber-500/30"
                : "from-emerald-50 to-white ring-emerald-200 dark:from-emerald-500/10 dark:to-zinc-900/40 dark:ring-emerald-500/30")
          }
        >
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("dashboard.feeBudget")}
          </div>
          <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatUZS(stats.feeUZS)}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              style={{ width: `${Math.min(100, feeBudgetPct * 100)}%` }}
              className={
                "h-full rounded-full transition-all " +
                (feePacingTone === "bad"
                  ? "bg-rose-500"
                  : feePacingTone === "warn"
                    ? "bg-amber-500"
                    : "bg-emerald-500")
              }
            />
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            {t("dashboard.feeBudgetSpent", {
              spent: formatUZS(stats.feeUZS),
              budget: formatUZS(policy.feeBudgetUZS),
            })}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t("dashboard.absenceHeatmap")}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              {t("dashboard.absenceHeatmapHint")}
            </div>
          </div>
          <div className="text-[11px] text-zinc-500">
            {ds.year} · {String(ds.month).padStart(2, "0")}
          </div>
        </CardHeader>
        <CardContent>
          <HeatmapCalendar points={heatPoints} weekStart={1} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t("dashboard.arrivalDist")}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{t("dashboard.arrivalDistHint")}</div>
          </CardHeader>
          <CardContent>
            <ArrivalHistogram bins={dayBins} expectedMin={expectedDayMin} graceMin={policy.graceMin} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t("dashboard.statusMix")}
            </div>
          </CardHeader>
          <CardContent>
            <StatusDonut slices={mix} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t("dashboard.deptLeaderboard")}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              {t("dashboard.deptLeaderboardHint")}
            </div>
          </CardHeader>
          <CardContent>
            <DeptLeaderboard rows={stats.deptRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t("dashboard.topOffenders")}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {stats.offenders.map((o) => {
                const maxFee = stats.offenders[0]?.fee ?? 1;
                const w = Math.max(6, (o.fee / maxFee) * 100);
                return (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-[11px] font-semibold text-white">
                      {initials(o.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="block truncate text-sm text-zinc-900 dark:text-zinc-100">
                        {o.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-rose-400 dark:bg-rose-500"
                            style={{ width: `${w}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500">{o.dept || "—"}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-right text-xs font-medium text-rose-600 dark:text-rose-300 tabular-nums">
                      {formatUZS(o.fee)}
                    </span>
                  </li>
                );
              })}
              {stats.offenders.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-zinc-500">—</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t("dashboard.genderShift")}
            </div>
          </CardHeader>
          <CardContent>
            <GenderShiftMatrix cells={matrix} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t("dashboard.regionTransport")}
            </div>
          </CardHeader>
          <CardContent>
            <RegionBar totals={regions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {t("dashboard.legend")}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["present", "late_flat", "late_step", "half_day", "absent", "incomplete"] as const).map(
            (s) => (
              <Badge key={s} variant="outline" className={STATUS_META[s].bg + " " + STATUS_META[s].color}>
                {STATUS_META[s].icon} {t(`status.${s}`)}
              </Badge>
            ),
          )}
          <span className="ml-auto text-[11px] text-zinc-500">
            {t("dashboard.totalWorked")}: {formatNumber(Math.round(stats.workedMinutes / 60), 0)} h
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
