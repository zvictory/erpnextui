import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatNumber } from "@/lib/formatters";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)}B`;
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}M`;
  if (value >= 1_000) return `${formatNumber(value / 1_000, 1)}K`;
  return formatNumber(value);
}

export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export { formatCurrency, formatInvoiceCurrency } from "@/lib/formatters";
