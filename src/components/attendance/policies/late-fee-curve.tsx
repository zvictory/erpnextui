"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatUZS } from "@/lib/attendance/format-hours";
import { formatNumber } from "@/lib/formatters";

interface LateFeeCurveProps {
  graceMin: number;
  flatFeeUZS: number;
  stepFeeUZS: number;
  dailyCapUZS: number;
}

const W = 480;
const H = 140;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 26;

export function LateFeeCurve({ graceMin, flatFeeUZS, stepFeeUZS, dailyCapUZS }: LateFeeCurveProps) {
  const t = useTranslations("attendance");

  const { points, capReachedAt, maxX, maxY } = useMemo(() => {
    const stepsToCap =
      stepFeeUZS > 0 ? Math.ceil(Math.max(0, dailyCapUZS - flatFeeUZS) / stepFeeUZS) : 0;
    const capX = graceMin + 10 + stepsToCap * 10;
    const xMax = Math.max(graceMin + 10 + 60, capX + 20);
    const yMax = Math.max(dailyCapUZS, flatFeeUZS) * 1.05;
    const pts: { x: number; y: number }[] = [];
    pts.push({ x: 0, y: 0 });
    pts.push({ x: graceMin, y: 0 });
    pts.push({ x: graceMin, y: flatFeeUZS });
    pts.push({ x: graceMin + 10, y: flatFeeUZS });
    let cur = flatFeeUZS;
    let m = graceMin + 10;
    while (cur < dailyCapUZS && m <= xMax) {
      m += 10;
      cur = Math.min(dailyCapUZS, cur + stepFeeUZS);
      pts.push({ x: m, y: cur });
    }
    pts.push({ x: xMax, y: cur });
    return { points: pts, capReachedAt: capX, maxX: xMax, maxY: yMax };
  }, [graceMin, flatFeeUZS, stepFeeUZS, dailyCapUZS]);

  const xToPx = (x: number) => PAD_L + (x / maxX) * (W - PAD_L - PAD_R);
  const yToPx = (y: number) => H - PAD_B - (y / maxY) * (H - PAD_T - PAD_B);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xToPx(p.x).toFixed(1)} ${yToPx(p.y).toFixed(1)}`)
    .join(" ");

  const capY = yToPx(dailyCapUZS);
  const flatY = yToPx(flatFeeUZS);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-2xl text-zinc-500"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x={PAD_L}
          y={PAD_T}
          width={xToPx(graceMin) - PAD_L}
          height={H - PAD_T - PAD_B}
          className="fill-emerald-100/60 dark:fill-emerald-500/10"
        />
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={capY}
          y2={capY}
          className="stroke-rose-400/60 dark:stroke-rose-400/50"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <text
          x={W - PAD_R}
          y={capY - 3}
          textAnchor="end"
          className="fill-rose-500 dark:fill-rose-400 text-[10px] tabular-nums"
        >
          {t("policies.summary.dailyCap")}: {formatUZS(dailyCapUZS)}
        </text>
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={flatY}
          y2={flatY}
          className="stroke-amber-400/40 dark:stroke-amber-400/30"
          strokeDasharray="2 4"
          strokeWidth={1}
        />
        <path
          d={path}
          className="fill-none stroke-cyan-500 dark:stroke-cyan-400"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={H - PAD_B}
          y2={H - PAD_B}
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth={1}
        />
        <line
          x1={PAD_L}
          x2={PAD_L}
          y1={PAD_T}
          y2={H - PAD_B}
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth={1}
        />
        {[graceMin, graceMin + 10, capReachedAt].map((m) => (
          <g key={m}>
            <line
              x1={xToPx(m)}
              x2={xToPx(m)}
              y1={H - PAD_B}
              y2={H - PAD_B + 3}
              className="stroke-zinc-400 dark:stroke-zinc-600"
              strokeWidth={1}
            />
            <text
              x={xToPx(m)}
              y={H - PAD_B + 14}
              textAnchor="middle"
              className="fill-zinc-500 dark:fill-zinc-400 text-[10px] tabular-nums"
            >
              {formatNumber(m, 0)}
            </text>
          </g>
        ))}
        <text
          x={W - PAD_R}
          y={H - PAD_B + 14}
          textAnchor="end"
          className="fill-zinc-500 dark:fill-zinc-400 text-[10px]"
        >
          {t("policies.summary.minShort")}
        </text>
      </svg>
    </div>
  );
}
