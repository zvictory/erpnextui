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

const STRONG_CURRENCIES = ["USD", "EUR", "GBP", "CNY", "RUB"];

/**
 * Determine the human-readable display direction for an exchange rate.
 * Always shows "1 STRONG = X WEAK" — never the confusing reciprocal like
 * "1 UZS = 0.00008 USD". Inverts the rate when needed.
 *
 * @param rawRate  Rate in the direction 1 fromCurrency = rawRate toCurrency
 * @param fromCurrency  Source currency code
 * @param toCurrency    Target currency code
 * @returns Normalised display info with direction-adjusted rate
 */
export function getExchangeRateDisplay(
  rawRate: number,
  fromCurrency: string,
  toCurrency: string,
): { baseCcy: string; quoteCcy: string; displayRate: number } {
  if (!rawRate || rawRate <= 0) {
    return { baseCcy: fromCurrency, quoteCcy: toCurrency, displayRate: rawRate };
  }

  const fromStrong = STRONG_CURRENCIES.includes(fromCurrency);
  const toStrong = STRONG_CURRENCIES.includes(toCurrency);

  if (fromStrong && !toStrong) {
    return { baseCcy: fromCurrency, quoteCcy: toCurrency, displayRate: rawRate };
  }

  if (toStrong && !fromStrong) {
    return { baseCcy: toCurrency, quoteCcy: fromCurrency, displayRate: 1 / rawRate };
  }

  if (rawRate < 1) {
    return { baseCcy: toCurrency, quoteCcy: fromCurrency, displayRate: 1 / rawRate };
  }

  return { baseCcy: fromCurrency, quoteCcy: toCurrency, displayRate: rawRate };
}

/**
 * Format an exchange rate with appropriate decimal precision.
 * Large rates (≥10): 2 dp, medium rates (1-10): 4 dp, small rates (<1): 6 dp.
 * After direction normalization the rate should always be ≥ 1.
 */
export function formatExchangeRate(rate: number): string {
  if (!rate || !Number.isFinite(rate)) return "—";
  if (rate >= 10) return formatNumber(rate, 2);
  if (rate >= 1) return formatNumber(rate, 4);
  return formatNumber(rate, 6);
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
