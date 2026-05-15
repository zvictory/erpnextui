"use client";

import { useState, useEffect, useRef } from "react";
import { formatNumber } from "@/lib/formatters";
import { useInView, animate } from "framer-motion";

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration = 2,
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        if (decimals > 0) {
          setDisplay(formatNumber(v, decimals));
        } else {
          setDisplay(formatNumber(Math.round(v)));
        }
      },
    });
    return controls.stop;
  }, [isInView, value, duration, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
