"use client";

import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/formatters";
import type { Partner } from "@/types/partner";

interface NetBalanceBadgeProps {
  netBalance: number;
  netDirection: Partner["netDirection"];
  currency?: string;
}

export function NetBalanceBadge({
  netBalance,
  netDirection,
  currency: _currency = "UZS",
}: NetBalanceBadgeProps) {
  if (netDirection === "settled" || netBalance === 0) {
    return (
      <Badge variant="secondary" className="text-xs font-mono tabular-nums">
        0
      </Badge>
    );
  }

  const isPositive = netDirection === "they_pay";
  const sign = isPositive ? "+" : "-";

  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono tabular-nums ${
        isPositive
          ? "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30"
          : "text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950/30"
      }`}
    >
      {sign}
      {formatNumber(netBalance)}
    </Badge>
  );
}
