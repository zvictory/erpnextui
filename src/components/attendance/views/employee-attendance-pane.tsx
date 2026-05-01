"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Rows3, ChevronRight } from "lucide-react";
import { useEmployees, useMonth, getDataset } from "@/lib/attendance/data";
import { STATUS_META, type DayStatus } from "@/lib/attendance/state-machine";
import { formatUZS, formatHours, pad, weekday } from "@/lib/attendance/format-hours";
import { formatNumber } from "@/lib/formatters";
import { useUIStore, type DayStatusFilter, type Metric } from "@/stores/attendance/ui-store";
import { KpiTile } from "@/components/attendance/ui/kpi-tile";
import { cn } from "@/lib/utils";

interface EmployeeAttendancePaneProps {
  employeeName: string | null;
}

const METRICS: Metric[] = ["worked", "absent", "late"];
const DAY_STATUS_FILTERS: DayStatusFilter[] = [
  "all",
  "present",
  "late_flat",
  "late_step",
  "half_day",
  "absent",
  "incomplete",
];
const DOW_KEYS_MON_FIRST = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DOW_KEY_BY_JS_DAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const toMondayIndex = (jsDay: number) => (jsDay + 6) % 7;

function statusFilterMatches(filter: DayStatusFilter, status: DayStatus): boolean {
  if (filter === "all") return true;
  return filter === status;
}

export function EmployeeAttendancePane({ employeeName }: EmployeeAttendancePaneProps) {
  const t = useTranslations("attendance");
  const ds = getDataset();
  const employees = useEmployees();
  const target = employeeName?.trim().toLowerCase() ?? null;
  const emp = target ? employees.find((e) => e.name.trim().toLowerCase() === target) ?? null : null;
  const m = useMonth(emp);
  const view = useUIStore((s) => s.employeeView);
  const setView = useUIStore((s) => s.setEmployeeView);
  const metric = useUIStore((s) => s.metric);
  const setMetric = useUIStore((s) => s.setMetric);
  const dayFilter = useUIStore((s) => s.dayStatusFilter);
  const setDayFilter = useUIStore((s) => s.setDayStatusFilter);

  const calendarCells = useMemo(() => {
    if (!m) return [];
    const firstDow = toMondayIndex(weekday(ds.year, ds.month, 1));
    const cells: ({ kind: "blank" } | { kind: "day"; day: (typeof m.perDay)[number] })[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ kind: "blank" });
    for (const d of m.perDay) cells.push({ kind: "day", day: d });
    while (cells.length % 7 !== 0) cells.push({ kind: "blank" });
    return cells;
  }, [m, ds.year, ds.month]);

  if (!emp || !m) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/40 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
        {t("emptyState.noDemoData")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label={t("kpi.totalHours")} value={formatHours(m.workedMinutes)} />
        <KpiTile
          label={t("metric.worked")}
          value={`${formatNumber(m.fullDays, 0)}${m.halfDays > 0 ? ` · ½${formatNumber(m.halfDays, 0)}` : ""}`}
          tone={metric === "worked" ? "good" : "default"}
        />
        <KpiTile
          label={t("kpi.absenceDays")}
          value={formatNumber(m.absentDays, 0)}
          tone={m.absentDays ? "bad" : "good"}
        />
        <KpiTile
          label={t("kpi.lateIncidents")}
          value={formatNumber(m.lateIncidents, 0)}
          tone={m.lateIncidents ? "warn" : "good"}
        />
        <KpiTile label={t("table.late")} value={formatNumber(m.lateMinutes, 0)} hint="min" />
        <KpiTile
          label={t("kpi.monthlyFees")}
          value={m.feeUZS ? formatUZS(m.feeUZS) : "—"}
          tone={m.feeUZS ? "bad" : "good"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {ds.year}-{pad(ds.month)}
          </div>
          <div className="inline-flex rounded-md border border-zinc-300 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs",
                view === "calendar"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              <CalendarDays className="h-3 w-3" /> {t("view.calendar")}
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs",
                view === "table"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              <Rows3 className="h-3 w-3" /> {t("view.table")}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <ChipGroup
              label={t("metric.label")}
              value={metric}
              options={METRICS.map((mk) => ({ value: mk, label: t(`metric.${mk}`) }))}
              onChange={(v) => setMetric(v as Metric)}
            />
            <ChipGroup
              label={t("filter.label")}
              value={dayFilter}
              options={DAY_STATUS_FILTERS.map((f) => ({
                value: f,
                label: f === "all" ? t("filter.all") : t(`status.${f}`),
              }))}
              onChange={(v) => setDayFilter(v as DayStatusFilter)}
            />
          </div>

          {view === "calendar" ? (
            <div>
              <div className="mb-2 grid grid-cols-7 gap-2">
                {DOW_KEYS_MON_FIRST.map((k, i) => (
                  <div
                    key={k}
                    className={cn(
                      "text-center text-[10px] uppercase tracking-wide",
                      i === 5 || i === 6
                        ? "text-rose-500 dark:text-rose-400"
                        : "text-zinc-500 dark:text-zinc-500",
                    )}
                  >
                    {t(`dow.${k}`)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell, idx) => {
                  if (cell.kind === "blank") {
                    return (
                      <div
                        key={`b${idx}`}
                        className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/30 dark:border-zinc-800 dark:bg-zinc-900/30"
                      />
                    );
                  }
                  const { day, result } = cell.day;
                  const meta = STATUS_META[result.status];
                  const dow = idx % 7;
                  const isWeekend = dow === 5 || dow === 6;
                  const matches = statusFilterMatches(dayFilter, result.status);
                  const metricBadge =
                    metric === "absent"
                      ? result.status === "absent"
                        ? t("status.absent")
                        : null
                      : metric === "late"
                        ? result.lateMin > 0
                          ? `+${formatNumber(result.lateMin, 0)}m`
                          : null
                        : result.status === "half_day"
                          ? "½"
                          : result.workedMin > 0
                            ? formatHours(result.workedMin)
                            : null;
                  return (
                    <div
                      key={day.d}
                      className={cn(
                        "block rounded-lg border bg-gradient-to-br p-2 transition",
                        meta.bg,
                        isWeekend && "ring-1 ring-zinc-200/60 dark:ring-zinc-800/60",
                        !matches && "opacity-30",
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium">{pad(day.d)}</span>
                        <span className={cn("text-base leading-none", meta.color)}>{meta.icon}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                        {day.in ?? "—"} → {day.out ?? "—"}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className={cn("font-medium", meta.color)}>{metricBadge ?? "·"}</span>
                        {result.feeUZS > 0 ? (
                          <span className="font-medium text-rose-600 dark:text-rose-300">
                            −{formatNumber(result.feeUZS, 0)}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">·</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <div className="flex flex-wrap gap-1.5">
                  {(["present", "late_flat", "late_step", "half_day", "absent", "incomplete"] as const).map(
                    (s) => (
                      <Badge key={s} variant="outline" className={STATUS_META[s].bg + " " + STATUS_META[s].color}>
                        {STATUS_META[s].icon} {t(`status.${s}`)}
                      </Badge>
                    ),
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span>{t("table.clickHint")}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500 dark:bg-zinc-900/60">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("table.day")}</th>
                    <th className="px-3 py-2 text-left">{t("table.dow")}</th>
                    <th className="px-3 py-2 text-left">{t("day.in")}</th>
                    <th className="px-3 py-2 text-left">{t("day.out")}</th>
                    <th className="px-3 py-2 text-right">{t("table.late")}</th>
                    <th className="px-3 py-2 text-right">{t("edit.extraMin")}</th>
                    <th className="px-3 py-2 text-right">{t("table.worked")}</th>
                    <th className="px-3 py-2 text-left">{t("table.status")}</th>
                    <th className="px-3 py-2 text-right">{t("table.fee")}</th>
                  </tr>
                </thead>
                <tbody>
                  {m.perDay.map(({ day, result }) => {
                    const meta = STATUS_META[result.status];
                    const dow = weekday(ds.year, ds.month, day.d);
                    const matches = statusFilterMatches(dayFilter, result.status);
                    return (
                      <tr
                        key={day.d}
                        className={cn(
                          "border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40",
                          !matches && "opacity-40",
                        )}
                      >
                        <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                          {pad(day.d)}
                        </td>
                        <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                          {t(`dow.${DOW_KEY_BY_JS_DAY[dow]}`)}
                        </td>
                        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{day.in ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{day.out ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-300">
                          {result.lateMin > 0 ? formatNumber(result.lateMin, 0) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                          {day.extraMin > 0 ? formatNumber(day.extraMin, 0) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-800 dark:text-zinc-200">
                          {formatHours(result.workedMin)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={meta.bg + " " + meta.color}>
                            {meta.icon} {t(`status.${result.status}`)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-300">
                          {result.feeUZS > 0 ? formatUZS(result.feeUZS) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">{label}</span>
      <div className="inline-flex flex-wrap gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/60">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded px-2 py-1 text-xs transition",
              value === o.value
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
