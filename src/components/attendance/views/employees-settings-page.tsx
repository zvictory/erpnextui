"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { usePolicy, usePolicyStore } from "@/stores/attendance/policy-store";
import { usePositions } from "@/lib/attendance/positions";
import {
  usePositionsStore,
  DEFAULT_POSITION_SALARY_UZS,
} from "@/stores/attendance/positions-store";
import { stajBonusPct } from "@/lib/attendance/payroll";
import { formatUZS } from "@/lib/attendance/format-hours";
import { type ShiftKind, REGIONS } from "@/lib/attendance/state-machine";
import { PoliciesSummary } from "@/components/attendance/policies/policies-summary";
import { LateFeeCurve } from "@/components/attendance/policies/late-fee-curve";
import { ShiftTimeline } from "@/components/attendance/policies/shift-timeline";
import { StajLadder } from "@/components/attendance/policies/staj-ladder";
import { PositionsSummary } from "@/components/attendance/positions/positions-summary";
import { HeadcountBar } from "@/components/attendance/positions/headcount-bar";
import { SalaryPip } from "@/components/attendance/positions/salary-pip";

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export function EmployeesSettingsPage() {
  const t = useTranslations("attendance");
  const policy = usePolicy();
  const setNumber = usePolicyStore((s) => s.setNumber);
  const setShiftField = usePolicyStore((s) => s.setShiftField);
  const setStajTier = usePolicyStore((s) => s.setStajTier);
  const addStajTier = usePolicyStore((s) => s.addStajTier);
  const removeStajTier = usePolicyStore((s) => s.removeStajTier);
  const setRegionRate = usePolicyStore((s) => s.setRegionRate);
  const resetPolicy = usePolicyStore((s) => s.resetPolicy);

  const positions = usePositions();
  const setPositionSalary = usePositionsStore((s) => s.setPositionSalary);
  const resetPosition = usePositionsStore((s) => s.resetPosition);
  const resetAllPositions = usePositionsStore((s) => s.resetAll);

  const shiftKinds = Object.keys(policy.shifts) as ShiftKind[];

  const positionsSummary = useMemo(() => {
    const headcount = positions.reduce((acc, p) => acc + p.count, 0);
    const customizedCount = positions.filter((p) => p.isCustom).length;
    const monthlyPayroll = positions.reduce((acc, p) => acc + p.salaryUZS * p.count, 0);
    const avgSalary =
      positions.length > 0
        ? positions.reduce((acc, p) => acc + p.salaryUZS, 0) / positions.length
        : 0;
    const maxCount = Math.max(1, ...positions.map((p) => p.count));
    const minSalary = Math.min(...positions.map((p) => p.salaryUZS));
    const maxSalary = Math.max(...positions.map((p) => p.salaryUZS));
    return { headcount, customizedCount, monthlyPayroll, avgSalary, maxCount, minSalary, maxSalary };
  }, [positions]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("policies.title")}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("policies.intro")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetPolicy}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {t("policy.reset")}
          </Button>
        </div>

        <PoliciesSummary
          graceMin={policy.graceMin}
          flatFeeUZS={policy.flatFeeUZS}
          dailyCapUZS={policy.dailyCapUZS}
          halfDayHours={Math.round(policy.halfDayMinMin / 60)}
          feeBudgetUZS={policy.feeBudgetUZS}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("policies.lateRules")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <NumField
                label={t("policy.grace")}
                value={policy.graceMin}
                onChange={(v) => setNumber("graceMin", v)}
                suffix="min"
              />
              <NumField
                label={t("policy.flatFee")}
                value={policy.flatFeeUZS}
                onChange={(v) => setNumber("flatFeeUZS", v)}
                suffix="UZS"
              />
              <NumField
                label={t("policy.stepFee")}
                value={policy.stepFeeUZS}
                onChange={(v) => setNumber("stepFeeUZS", v)}
                suffix="UZS / 10m"
              />
              <NumField
                label={t("policy.dailyCap")}
                value={policy.dailyCapUZS}
                onChange={(v) => setNumber("dailyCapUZS", v)}
                suffix="UZS"
              />
              <div className="col-span-2">
                <LateFeeCurve
                  graceMin={policy.graceMin}
                  flatFeeUZS={policy.flatFeeUZS}
                  stepFeeUZS={policy.stepFeeUZS}
                  dailyCapUZS={policy.dailyCapUZS}
                />
              </div>
              <div className="col-span-2 text-xs text-zinc-500">
                {t("policy.preview")}:{" "}
                {t("policies.lateRulesBody", {
                  flat: formatUZS(policy.flatFeeUZS),
                  step: formatUZS(policy.stepFeeUZS),
                  cap: formatUZS(policy.dailyCapUZS),
                  grace: policy.graceMin,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("policies.halfDay")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <NumField
                label={t("policy.halfDayMin")}
                value={Math.round(policy.halfDayMinMin / 60)}
                onChange={(v) => setNumber("halfDayMinMin", Math.max(0, v) * 60)}
                suffix="h"
              />
              <NumField
                label={t("policy.feeBudget")}
                value={policy.feeBudgetUZS}
                onChange={(v) => setNumber("feeBudgetUZS", Math.max(0, v))}
                suffix="UZS / mo"
              />
              <div className="col-span-2 text-xs text-zinc-500">{t("policies.halfDayBody")}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("policies.transport")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {REGIONS.map((r) => (
              <NumField
                key={r}
                label={t(`region.${r}`)}
                value={policy.regionRatesUZS[r]}
                onChange={(v) => setRegionRate(r, Math.max(0, v))}
                suffix={`UZS / ${t("payroll.perDayShort")}`}
              />
            ))}
            <div className="text-xs text-zinc-500 md:col-span-3">{t("policies.transportBody")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("policy.shiftDefs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {shiftKinds.map((k) => (
              <ShiftTimeline key={k} def={policy.shifts[k]} label={t(`shift.${k}`)} />
            ))}
            <div className="-mx-6 mt-4 overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500 dark:bg-zinc-900/60">
                  <tr>
                    <th className="px-4 py-2 text-left">{t("table.shift")}</th>
                    <th className="px-3 py-2 text-right">{t("policy.shiftStart")}</th>
                    <th className="px-3 py-2 text-right">{t("policy.shiftEnd")}</th>
                    <th className="px-3 py-2 text-right">{t("policy.length")}</th>
                    <th className="px-3 py-2 text-right">{t("policy.anchor")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftKinds.map((k) => {
                    const def = policy.shifts[k];
                    return (
                      <tr key={k} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">
                          {t(`shift.${k}`)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            value={def.startH}
                            min={0}
                            max={23}
                            onChange={(e) =>
                              setShiftField(k, { startH: clamp(Number(e.target.value), 0, 23) })
                            }
                            className="inline-block w-16 text-right"
                          />
                          <span className="mx-1 text-zinc-400">:</span>
                          <Input
                            type="number"
                            value={def.startM}
                            min={0}
                            max={59}
                            onChange={(e) =>
                              setShiftField(k, { startM: clamp(Number(e.target.value), 0, 59) })
                            }
                            className="inline-block w-16 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            value={def.endH}
                            min={0}
                            max={23}
                            onChange={(e) =>
                              setShiftField(k, { endH: clamp(Number(e.target.value), 0, 23) })
                            }
                            className="inline-block w-16 text-right"
                          />
                          <span className="ml-1 text-zinc-400">:00</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            value={Math.round(def.lengthMin / 60)}
                            min={1}
                            max={24}
                            onChange={(e) =>
                              setShiftField(k, {
                                lengthMin: clamp(Number(e.target.value), 1, 24) * 60,
                              })
                            }
                            className="inline-block w-16 text-right"
                          />
                          <span className="ml-1 text-zinc-400">h</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            value={def.halfDayAnchorH}
                            min={0}
                            max={23}
                            onChange={(e) =>
                              setShiftField(k, {
                                halfDayAnchorH: clamp(Number(e.target.value), 0, 23),
                              })
                            }
                            className="inline-block w-16 text-right"
                          />
                          <span className="ml-1 text-zinc-400">:00</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{t("policies.staj")}</CardTitle>
            <Button variant="outline" size="sm" onClick={addStajTier}>
              <Plus className="mr-1 h-3 w-3" />
              {t("policy.addTier")}
            </Button>
          </CardHeader>
          <CardContent>
            <StajLadder tiers={policy.stajTiers} />
            <div className="-mx-6 mt-4 overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500 dark:bg-zinc-900/60">
                  <tr>
                    <th className="px-4 py-2 text-left">{t("payroll.stajYears")} ≥</th>
                    <th className="px-4 py-2 text-right">{t("policy.bonusPct")}</th>
                    <th className="px-4 py-2 text-right">{t("policy.range")}</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {policy.stajTiers.map((tier, i) => {
                    const next = policy.stajTiers[i + 1];
                    const range = next
                      ? `${tier.minYears}–${next.minYears - 1}`
                      : `${tier.minYears}+`;
                    return (
                      <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={tier.minYears}
                            min={0}
                            onChange={(e) =>
                              setStajTier(i, { minYears: Math.max(0, Number(e.target.value)) })
                            }
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            value={Math.round(tier.pct * 100)}
                            min={0}
                            max={100}
                            onChange={(e) =>
                              setStajTier(i, {
                                pct: clamp(Number(e.target.value), 0, 100) / 100,
                              })
                            }
                            className="inline-block w-20 text-right"
                          />
                          <span className="ml-1 text-zinc-400">%</span>
                        </td>
                        <td className="px-4 py-2 text-right text-zinc-500">
                          <Badge variant="outline">{range}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStajTier(i)}
                            aria-label={t("policy.removeTier")}
                          >
                            <Trash2 className="h-4 w-4 text-zinc-400 hover:text-rose-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("positions.title")}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("positions.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetAllPositions}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {t("positions.resetAll")}
          </Button>
        </div>

        <PositionsSummary
          positionCount={positions.length}
          headcount={positionsSummary.headcount}
          customizedCount={positionsSummary.customizedCount}
          avgSalaryUZS={positionsSummary.avgSalary}
          monthlyPayrollUZS={positionsSummary.monthlyPayroll}
        />

        <Card className="overflow-hidden p-0">
          <CardHeader>
            <CardTitle className="text-sm">
              {t("positions.catalog")} · {positions.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500 dark:bg-zinc-900/60">
                  <tr>
                    <th className="px-4 py-2 text-left">{t("positions.label")}</th>
                    <th className="px-4 py-2 text-left">{t("positions.employees")}</th>
                    <th className="px-4 py-2 text-right">{t("positions.salary")}</th>
                    <th className="px-4 py-2 text-left">{t("positions.summary.salaryRange")}</th>
                    <th className="px-4 py-2 text-left">{t("positions.withStaj")}</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const span = positionsSummary.maxSalary - positionsSummary.minSalary;
                    const ratio =
                      span > 0 ? (p.salaryUZS - positionsSummary.minSalary) / span : 0.5;
                    return (
                      <tr
                        key={p.label}
                        className="border-t border-zinc-200 align-top hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                      >
                        <td className="px-4 py-2">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">
                            {p.label}
                          </div>
                          {p.isCustom ? (
                            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                              {t("positions.customized")}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <HeadcountBar count={p.count} max={positionsSummary.maxCount} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            step={100000}
                            min={0}
                            value={p.salaryUZS}
                            onChange={(e) =>
                              setPositionSalary(p.label, Math.max(0, Number(e.target.value)))
                            }
                            className="w-36 text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <SalaryPip ratio={ratio} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {policy.stajTiers.map((tier) => {
                              const withBonus =
                                p.salaryUZS * (1 + stajBonusPct(tier.minYears, policy.stajTiers));
                              return (
                                <Badge key={tier.minYears} variant="outline">
                                  {tier.minYears}y · +{Math.round(tier.pct * 100)}% ={" "}
                                  {formatUZS(withBonus)}
                                </Badge>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {p.isCustom ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetPosition(p.label)}
                              className="text-xs"
                            >
                              {t("positions.reset")}
                            </Button>
                          ) : (
                            <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("positions.defaultHint", {
            value: formatUZS(DEFAULT_POSITION_SALARY_UZS),
          })}
        </p>
      </section>
    </div>
  );
}

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}

function NumField({ label, value, onChange, suffix }: NumFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full"
        />
        {suffix ? <span className="shrink-0 text-xs text-zinc-500">{suffix}</span> : null}
      </div>
    </label>
  );
}
