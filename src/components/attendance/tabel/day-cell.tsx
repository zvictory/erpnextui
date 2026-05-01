"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";

export type TabelCode = "k" | "y" | "d" | "n" | "h" | "f" | "x" | "";

const CODE_BG: Record<TabelCode, string> = {
  k: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  y: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  d: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400",
  n: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  h: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
  f: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  x: "bg-zinc-50 text-zinc-300 dark:bg-zinc-900/40 dark:text-zinc-600",
  "": "text-zinc-300 dark:text-zinc-700",
};

const GLYPH: Record<TabelCode, string> = {
  k: "K",
  y: "Y",
  d: "D",
  n: "?",
  h: "+",
  f: "−",
  x: "/",
  "": "·",
};

interface DayCellProps {
  href?: string;
  code: TabelCode;
  isWeekend: boolean;
  isHighlighted: boolean;
  feeUZS: number;
  lateMin: number;
  lateRatio: number;
}

export function DayCell({
  href,
  code,
  isWeekend,
  isHighlighted,
  feeUZS,
  lateMin,
  lateRatio,
}: DayCellProps) {
  const hasFee = feeUZS > 0;
  const showLateUnderlay = (code === "k" || code === "y") && lateMin > 0;
  const lateStep = Math.min(3, Math.floor(lateRatio * 4));
  const lateUnderlayCls = [
    "bg-amber-200/20 dark:bg-amber-400/10",
    "bg-amber-200/40 dark:bg-amber-400/20",
    "bg-amber-300/55 dark:bg-amber-400/30",
    "bg-amber-400/65 dark:bg-amber-500/40",
  ][lateStep];

  return (
    <td
      className={cn(
        "relative w-[26px] border border-zinc-200 p-0 text-center font-semibold uppercase dark:border-zinc-800",
        CODE_BG[code],
        isWeekend && code === "" && "bg-rose-50/40 dark:bg-rose-500/5",
        isHighlighted && "border-x-cyan-500/60 dark:border-x-cyan-400/70",
      )}
      title={
        hasFee || lateMin > 0
          ? `${lateMin > 0 ? `${lateMin}m late` : ""}${
              lateMin > 0 && hasFee ? " · " : ""
            }${hasFee ? `${formatNumber(feeUZS, 0)} сўм` : ""}`
          : undefined
      }
    >
      {href ? (
        <Link
          href={href}
          className="relative block px-0 py-1 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
        >
          {showLateUnderlay && (
            <span
              aria-hidden
              className={cn("pointer-events-none absolute inset-0", lateUnderlayCls)}
            />
          )}
          <span className="relative">{GLYPH[code]}</span>
          {hasFee && (
            <span
              aria-hidden
              className="pointer-events-none absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.7)] dark:bg-rose-400 dark:shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
            />
          )}
        </Link>
      ) : (
        <div className="relative px-0 py-1">
          {showLateUnderlay && (
            <span
              aria-hidden
              className={cn("pointer-events-none absolute inset-0", lateUnderlayCls)}
            />
          )}
          <span className="relative">{GLYPH[code]}</span>
          {hasFee && (
            <span
              aria-hidden
              className="pointer-events-none absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.7)] dark:bg-rose-400 dark:shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
            />
          )}
        </div>
      )}
    </td>
  );
}
