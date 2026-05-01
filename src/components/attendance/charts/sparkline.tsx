"use client";
import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeClass?: string;
  fillClass?: string;
}

// Pure-SVG sparkline. Normalizes any series to a 0..100 viewBox so the curve
// stretches fluidly inside its container without re-layout work.
export function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
  strokeClass = "stroke-cyan-500 dark:stroke-cyan-400",
  fillClass = "fill-cyan-500/10 dark:fill-cyan-400/15",
}: SparklineProps) {
  if (!values.length) return <svg width={width} height={height} className={className} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? 100 / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = 100 - ((v - min) / range) * 100;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L100,100 L0,100 Z`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <path d={area} className={cn("stroke-none", fillClass)} />
      <path
        d={path}
        className={cn("fill-none", strokeClass)}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
