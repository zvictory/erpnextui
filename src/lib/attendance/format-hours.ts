import { formatNumber } from "@/lib/formatters";

// UZS has no fractional unit in practice — round and append "сўм" suffix.
// Use this everywhere across the attendance module instead of formatCurrency,
// which would emit "1 234,00 сўм".
export function formatUZS(value: number): string {
  return `${formatNumber(Math.round(value), 0)} сўм`;
}

export function formatHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function weekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
