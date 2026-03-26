import { format, parse } from "date-fns";
import { useUISettingsStore } from "@/stores/ui-settings-store";

type NumberFormat = "1,234.56" | "1.234,56" | "1 234,56";

const NUMBER_FORMAT_LOCALE: Record<NumberFormat, string> = {
  "1,234.56": "en-US",
  "1.234,56": "de-DE",
  "1 234,56": "fr-FR",
};

function getSettings() {
  return useUISettingsStore.getState();
}

/**
 * Parse an ERPNext date string ("YYYY-MM-DD") and format with user's preferred format.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(date, getSettings().dateFormat);
  } catch {
    return dateStr;
  }
}

/**
 * Format number with user's preferred group/decimal separators.
 */
export function formatNumber(value: number, decimals?: number): string {
  const locale = NUMBER_FORMAT_LOCALE[getSettings().numberFormat];
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
  }).format(value);
}

/**
 * Format currency value (number + symbol positioning).
 */
export function formatCurrency(value: number, symbol = "$", symbolOnRight = false): string {
  const formatted = formatNumber(value, 2);
  return symbolOnRight ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
}

/**
 * Format multiple currency amounts joined with " / ".
 * Filters out zero amounts; falls back to formatCurrency(0) if all are zero.
 */
export function formatMultiCurrency(
  amounts: { currency: string; value: number }[],
  currencyMap: Map<string, { symbol: string; onRight: boolean }>,
): string {
  const nonZero = amounts.filter((a) => a.value !== 0);
  if (nonZero.length === 0) return formatCurrency(0);

  return nonZero
    .map((a) => {
      const info = currencyMap.get(a.currency);
      return formatCurrency(a.value, info?.symbol ?? a.currency, info?.onRight ?? false);
    })
    .join(" / ");
}

/**
 * Format currency with invoice-specific currency info.
 */
export function formatInvoiceCurrency(
  value: number,
  currency?: string,
  currencyInfo?: { symbol: string; onRight: boolean },
): string {
  const formatted = formatNumber(value, 2);

  if (currencyInfo) {
    return currencyInfo.onRight
      ? `${formatted} ${currencyInfo.symbol}`
      : `${currencyInfo.symbol}${formatted}`;
  }

  if (currency) return `${formatted} ${currency}`;
  return formatted;
}
