"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { Sparkline } from "./sparkline";

type Tone = "default" | "good" | "warn" | "bad";

interface AnimatedKpiProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  tone?: Tone;
  delta?: number;
  deltaLabel?: string;
  invertDelta?: boolean;
  trend?: number[];
  format?: "number" | "compact";
}

const TONES: Record<Tone, string> = {
  default:
    "from-zinc-50 to-white ring-zinc-200 dark:from-zinc-800/60 dark:to-zinc-900/40 dark:ring-zinc-800",
  good: "from-emerald-50 to-white ring-emerald-200 dark:from-emerald-500/10 dark:to-zinc-900/40 dark:ring-emerald-500/30",
  warn: "from-amber-50 to-white ring-amber-200 dark:from-amber-500/10 dark:to-zinc-900/40 dark:ring-amber-500/30",
  bad: "from-rose-50 to-white ring-rose-200 dark:from-rose-500/10 dark:to-zinc-900/40 dark:ring-rose-500/30",
};

const SPARK: Record<Tone, { stroke: string; fill: string }> = {
  default: { stroke: "stroke-zinc-400 dark:stroke-zinc-500", fill: "fill-zinc-400/10" },
  good: { stroke: "stroke-emerald-500 dark:stroke-emerald-400", fill: "fill-emerald-500/10" },
  warn: { stroke: "stroke-amber-500 dark:stroke-amber-400", fill: "fill-amber-500/10" },
  bad: { stroke: "stroke-rose-500 dark:stroke-rose-400", fill: "fill-rose-500/10" },
};

function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}M`;
  if (abs >= 1_000) return `${formatNumber(value / 1_000, 1)}K`;
  return formatNumber(value, 0);
}

export function AnimatedKpi({
  label,
  value,
  suffix,
  prefix,
  tone = "default",
  delta,
  deltaLabel,
  invertDelta = false,
  trend,
  format = "number",
}: AnimatedKpiProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = hasDelta && delta! > 0;
  const isDown = hasDelta && delta! < 0;
  const goodDirection = invertDelta ? isDown : isUp;
  const badDirection = invertDelta ? isUp : isDown;
  const deltaTone = goodDirection
    ? "text-emerald-600 dark:text-emerald-400"
    : badDirection
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-500 dark:text-zinc-400";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  const display = format === "compact" ? compact(value) : formatNumber(value, 0);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ring-1",
        TONES[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        {hasDelta ? (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium",
              deltaTone,
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{Math.round(Math.abs(delta!) * 100)}%</span>
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {prefix ? <span className="text-xl font-medium text-zinc-500">{prefix}</span> : null}
        <span className="tabular-nums">{display}</span>
        {suffix ? <span className="text-base font-medium text-zinc-500">{suffix}</span> : null}
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="text-[11px] text-zinc-500 dark:text-zinc-500">{deltaLabel ?? ""}</div>
        {trend && trend.length > 1 ? (
          <Sparkline
            values={trend}
            width={96}
            height={28}
            strokeClass={SPARK[tone].stroke}
            fillClass={SPARK[tone].fill}
          />
        ) : null}
      </div>
    </div>
  );
}
