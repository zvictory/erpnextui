"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  useEmployees,
  computeMonth,
  getDataset,
  getDepartments,
  employmentMarker,
  type MonthlyStats,
} from "@/lib/attendance/data";
import { usePolicy } from "@/stores/attendance/policy-store";
import { inferGender, type Gender } from "@/lib/attendance/gender";
import type { ShiftKind, DayResult } from "@/lib/attendance/state-machine";
import { pad, weekday } from "@/lib/attendance/format-hours";
import { AvatarPill } from "@/components/attendance/employees/avatar-pill";
import { AttendanceStrip } from "@/components/attendance/employees/attendance-strip";
import { TabelSummary } from "@/components/attendance/tabel/tabel-summary";
import { DayColumnBar } from "@/components/attendance/tabel/day-column-bar";
import { DayCell, type TabelCode } from "@/components/attendance/tabel/day-cell";
import { cn } from "@/lib/utils";

const SHIFT_KINDS: ShiftKind[] = ["day", "night", "office", "light", "flexible", "remote"];

type SortKey = "name" | "workDays" | "kCount" | "dCount" | "nCount" | "position" | "dept";
type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = ["name", "workDays", "kCount", "dCount", "nCount", "position", "dept"];
const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function statusToCode(r: DayResult): TabelCode {
  if (r.status === "present" || r.status === "late_flat" || r.status === "late_step") return "k";
  if (r.status === "half_day") return "y";
  if (r.status === "incomplete") return "n";
  if (r.status === "absent") return "d";
  return "";
}

export function EmployeesTabelView() {
  return (
    <Suspense fallback={null}>
      <TabelInner />
    </Suspense>
  );
}

function TabelInner() {
  const t = useTranslations("attendance");
  const ds = getDataset();
  const employees = useEmployees();
  const policy = usePolicy();

  const searchParams = useSearchParams();
  const dayParam = Number(searchParams?.get("day") ?? 0);
  const highlightDay =
    Number.isFinite(dayParam) && dayParam >= 1 && dayParam <= ds.days ? dayParam : 0;

  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("");
  const [gender, setGender] = useState<"" | Gender>("");
  const [shift, setShift] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const depts = useMemo(() => getDepartments(), []);

  const { rows, summary, colTotals } = useMemo(() => {
    const norm = q.trim().toLowerCase();
    const enriched = employees
      .filter((e) => !dept || e.dept === dept)
      .filter((e) => !shift || e.shift === shift)
      .filter((e) => !gender || inferGender(e.name) === gender)
      .filter(
        (e) =>
          !norm ||
          e.name.toLowerCase().includes(norm) ||
          (e.position || "").toLowerCase().includes(norm) ||
          (e.dept || "").toLowerCase().includes(norm),
      )
      .map((emp) => {
        const month = computeMonth(emp, policy);
        const codes: TabelCode[] = month.perDay.map((p) => {
          const marker = employmentMarker(emp, ds.year, ds.month, p.day.d);
          if (marker === "hire") return "h";
          if (marker === "termination") return "f";
          if (marker === "before" || marker === "after") return "x";
          return statusToCode(p.result);
        });
        let kCount = 0;
        let yCount = 0;
        let dCount = 0;
        let nCount = 0;
        for (const c of codes) {
          if (c === "k") kCount += 1;
          else if (c === "y") yCount += 1;
          else if (c === "d") dCount += 1;
          else if (c === "n") nCount += 1;
        }
        const workDays = kCount + yCount * 0.5;
        return {
          id: emp.id,
          name: emp.name,
          position: emp.position || "—",
          deptName: emp.dept || "—",
          codes,
          perDay: month.perDay,
          totalFee: month.feeUZS,
          lateIncidents: month.lateIncidents,
          kCount,
          yCount,
          dCount,
          nCount,
          workDays,
        };
      });

    const dir = sortDir === "asc" ? 1 : -1;
    enriched.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "ru");
          break;
        case "position":
          cmp =
            a.position.localeCompare(b.position, "ru") || a.name.localeCompare(b.name, "ru");
          break;
        case "dept":
          cmp =
            a.deptName.localeCompare(b.deptName, "ru") || a.name.localeCompare(b.name, "ru");
          break;
        case "workDays":
          cmp = a.workDays - b.workDays || a.name.localeCompare(b.name, "ru");
          break;
        case "kCount":
          cmp = a.kCount - b.kCount || a.name.localeCompare(b.name, "ru");
          break;
        case "dCount":
          cmp = a.dCount - b.dCount || a.name.localeCompare(b.name, "ru");
          break;
        case "nCount":
          cmp = a.nCount - b.nCount || a.name.localeCompare(b.name, "ru");
          break;
      }
      return cmp * dir;
    });

    const indexed = enriched.map((row, i) => ({ ...row, idx: i + 1 }));

    const cols = Array.from({ length: ds.days }, () => ({ k: 0, y: 0, n: 0, d: 0, scheduled: 0 }));
    for (const r of indexed) {
      for (let i = 0; i < r.codes.length; i++) {
        const c = r.codes[i];
        if (c === "k") cols[i].k += 1;
        else if (c === "y") cols[i].y += 1;
        else if (c === "n") cols[i].n += 1;
        else if (c === "d") cols[i].d += 1;
        if (c === "k" || c === "y" || c === "n" || c === "d") cols[i].scheduled += 1;
      }
    }

    let totalFee = 0;
    let lateIncidents = 0;
    let cleanCount = 0;
    let halfDays = 0;
    for (const r of indexed) {
      totalFee += r.totalFee;
      lateIncidents += r.lateIncidents;
      if (r.totalFee === 0 && r.nCount === 0 && r.dCount === 0) cleanCount += 1;
      halfDays += r.yCount;
    }

    return {
      rows: indexed,
      colTotals: cols,
      summary: {
        count: indexed.length,
        totalFee,
        lateIncidents,
        cleanCount,
        halfDays,
      },
    };
  }, [employees, policy, ds.year, ds.month, ds.days, q, dept, gender, shift, sortKey, sortDir]);

  const dayNumbers = Array.from({ length: ds.days }, (_, i) => i + 1);

  const highlightRef = useRef<HTMLTableCellElement | null>(null);
  useEffect(() => {
    if (!highlightDay) return;
    highlightRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [highlightDay]);

  const inputCls =
    "rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 " +
    "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-cyan-500/20 " +
    "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

  const capMin = Math.max(
    30,
    (policy.dailyCapUZS / Math.max(policy.stepFeeUZS, 1)) * 10 + policy.graceMin,
  );

  return (
    <div className="space-y-4">
      <Card className="p-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("table.search")}
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className={inputCls}>
            <option value="">
              {t("table.department")} · {t("filter.all")}
            </option>
            {depts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "" | Gender)}
            className={inputCls}
          >
            <option value="">{t("tabel.all")}</option>
            <option value="m">{t("tabel.men")}</option>
            <option value="f">{t("tabel.women")}</option>
          </select>
          <select value={shift} onChange={(e) => setShift(e.target.value)} className={inputCls}>
            <option value="">
              {t("table.shift")} · {t("filter.all")}
            </option>
            {SHIFT_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`shift.${k}`)}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{t("tabel.sortBy")}:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className={inputCls}
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`tabel.sort.${k}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="rounded-md border px-2 py-2 text-sm border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title={sortDir === "asc" ? t("tabel.sortAsc") : t("tabel.sortDesc")}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            {rows.length} / {employees.length}
          </span>
        </div>
      </Card>

      <TabelSummary
        count={summary.count}
        totalCount={employees.length}
        totalFee={summary.totalFee}
        lateIncidents={summary.lateIncidents}
        cleanCount={summary.cleanCount}
        halfDays={summary.halfDays}
      />

      <div className="text-xs text-zinc-500">{t("tabel.legend")}</div>

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="border-collapse text-[11px] tabular-nums">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/60">
                  <th
                    rowSpan={3}
                    className="sticky left-0 z-20 border border-zinc-200 bg-zinc-50 px-2 py-1 text-center font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {t("tabel.rowNum")}
                  </th>
                  <th
                    rowSpan={3}
                    className="sticky left-[36px] z-20 min-w-[220px] border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {t("tabel.fullName")}
                  </th>
                  <th
                    rowSpan={3}
                    className="sticky left-[256px] z-20 min-w-[160px] border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {t("tabel.position")}
                  </th>
                  {dayNumbers.map((d) => (
                    <th
                      key={`bar-${d}`}
                      className={cn(
                        "border border-zinc-200 px-1 pb-0 pt-1 text-center font-normal dark:border-zinc-800",
                        highlightDay === d && "border-x-cyan-500/60 dark:border-x-cyan-400/70",
                      )}
                    >
                      <DayColumnBar
                        k={colTotals[d - 1].k}
                        y={colTotals[d - 1].y}
                        n={colTotals[d - 1].n}
                        d={colTotals[d - 1].d}
                        total={colTotals[d - 1].scheduled}
                      />
                    </th>
                  ))}
                  <th
                    colSpan={3}
                    rowSpan={2}
                    className="border border-zinc-200 bg-zinc-100 px-2 py-1 text-center font-semibold dark:border-zinc-800 dark:bg-zinc-800"
                  >
                    {t("tabel.totals")}
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-zinc-200 bg-zinc-100 px-2 py-1 text-center font-semibold dark:border-zinc-800 dark:bg-zinc-800"
                  >
                    {t("tabel.workDays")}
                  </th>
                  <th
                    rowSpan={3}
                    className="sticky right-0 z-20 border border-zinc-200 bg-zinc-50 px-2 py-1 text-center font-medium print:hidden dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {t("employees.fingerprint")}
                  </th>
                </tr>
                <tr className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/60">
                  {dayNumbers.map((d) => {
                    const dow = weekday(ds.year, ds.month, d);
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <th
                        key={`dow-${d}`}
                        className={cn(
                          "border border-zinc-200 px-1 py-0.5 text-center text-[10px] font-normal dark:border-zinc-800",
                          isWeekend && "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
                          highlightDay === d && "border-x-cyan-500/60 dark:border-x-cyan-400/70",
                        )}
                      >
                        {DOW_SHORT[dow]}
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/60">
                  {dayNumbers.map((d) => {
                    const dow = weekday(ds.year, ds.month, d);
                    const isWeekend = dow === 0 || dow === 6;
                    const isHighlighted = highlightDay === d;
                    return (
                      <th
                        key={`day-${d}`}
                        ref={isHighlighted ? highlightRef : undefined}
                        className={cn(
                          "border border-zinc-200 px-1 py-0.5 text-center font-medium dark:border-zinc-800",
                          isWeekend && "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
                          isHighlighted &&
                            "bg-cyan-50 text-cyan-700 ring-2 ring-inset ring-cyan-500/60 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-400/70",
                        )}
                      >
                        {pad(d)}
                      </th>
                    );
                  })}
                  <th className="border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-center text-emerald-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-emerald-300">
                    {t("tabel.kCount")}
                  </th>
                  <th className="border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-center text-amber-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-amber-300">
                    {t("tabel.yCount")}
                  </th>
                  <th className="border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                    {t("tabel.dCount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="sticky left-0 z-10 border border-zinc-200 bg-white px-2 py-1 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                      {row.idx}
                    </td>
                    <td className="sticky left-[36px] z-10 border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex items-center gap-2">
                        <AvatarPill name={row.name} size="sm" />
                        <div className="min-w-0">
                          <div className="block truncate font-medium text-zinc-800 dark:text-zinc-100">
                            {row.name}
                          </div>
                          <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                            {row.deptName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="sticky left-[256px] z-10 border border-zinc-200 bg-white px-2 py-1 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                      {row.position}
                    </td>
                    {row.codes.map((c, i) => {
                      const dow = weekday(ds.year, ds.month, i + 1);
                      const isWeekend = dow === 0 || dow === 6;
                      const isHighlighted = highlightDay === i + 1;
                      const result = row.perDay[i]?.result;
                      const lateMin = result?.lateMin ?? 0;
                      const feeUZS = result?.feeUZS ?? 0;
                      const lateRatio = capMin > 0 ? Math.min(1, lateMin / capMin) : 0;
                      return (
                        <DayCell
                          key={i}
                          code={c}
                          isWeekend={isWeekend}
                          isHighlighted={isHighlighted}
                          feeUZS={feeUZS}
                          lateMin={lateMin}
                          lateRatio={lateRatio}
                        />
                      );
                    })}
                    <td className="border border-zinc-200 bg-emerald-50/40 px-2 py-1 text-center font-semibold text-emerald-700 dark:border-zinc-800 dark:bg-emerald-500/5 dark:text-emerald-300">
                      {row.kCount}
                    </td>
                    <td className="border border-zinc-200 bg-amber-50/40 px-2 py-1 text-center font-semibold text-amber-700 dark:border-zinc-800 dark:bg-amber-500/5 dark:text-amber-300">
                      {row.yCount}
                    </td>
                    <td className="border border-zinc-200 bg-zinc-100/60 px-2 py-1 text-center font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                      {row.dCount}
                    </td>
                    <td className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-center font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                      {row.workDays % 1 === 0 ? row.workDays : row.workDays.toFixed(1)}
                    </td>
                    <td
                      className="sticky right-0 z-10 border border-zinc-200 bg-white px-2 py-1 print:hidden dark:border-zinc-800 dark:bg-zinc-950"
                      title={`${row.totalFee.toLocaleString("ru-RU")} сўм · ${row.lateIncidents} late`}
                    >
                      <FingerprintCell perDay={row.perDay} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FingerprintCell({ perDay }: { perDay: MonthlyStats["perDay"] }) {
  return (
    <div className="flex items-center justify-center">
      <AttendanceStrip perDay={perDay} size="sm" cellWidth={3} gap={1} />
    </div>
  );
}
