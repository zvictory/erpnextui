/**
 * Multi-currency Golden Rule helpers.
 *
 * INVARIANT: user-entered amounts are sacred. Exchange rates are DERIVED from
 * amounts, never the inverse. Never compute `base = amount * rate` from a
 * stored/fetched rate, because floating-point drift produces GL mismatches
 * like 7,500,000 → 7,499,938.32.
 */

export function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundTo6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Derive exchange rate from amounts.
 * @param baseAmount company-currency amount (user-confirmed)
 * @param foreignAmount account-currency amount (user-confirmed)
 * @returns rate such that baseAmount = foreignAmount * rate
 */
export function deriveRate(baseAmount: number, foreignAmount: number, fallback = 1): number {
  if (foreignAmount <= 0) return fallback;
  return baseAmount / foreignAmount;
}

export interface PaymentRates {
  sourceExchangeRate: number;
  targetExchangeRate: number;
  basePaidAmount: number;
  baseReceivedAmount: number;
}

/**
 * Compute Payment Entry rates + base amounts from user-sacred inputs.
 *
 * Rules:
 * - `paid_amount` (sent currency) and `received_amount` (landed currency) are sacred.
 * - `source_exchange_rate` converts paid_amount to company currency.
 * - `target_exchange_rate` converts received_amount to company currency.
 * - When one side IS company currency, its rate is exactly 1 (never derived).
 * - base_*_amount is the user-confirmed value (if that side is company currency)
 *   or amount * derived_rate (if the other side is company currency).
 */
export function calculatePaymentEntry(params: {
  paidAmount: number;
  receivedAmount: number;
  paidCurrency: string;
  receivedCurrency: string;
  companyCurrency: string;
}): PaymentRates {
  const { paidAmount, receivedAmount, paidCurrency, receivedCurrency, companyCurrency } = params;

  // Same currency on both legs — rates are 1, bases are the amounts themselves.
  if (paidCurrency === receivedCurrency) {
    const rate = paidCurrency === companyCurrency ? 1 : 0; // 0 means "caller must supply rate to UZS"
    return {
      sourceExchangeRate: rate,
      targetExchangeRate: rate,
      basePaidAmount: paidCurrency === companyCurrency ? paidAmount : 0,
      baseReceivedAmount: paidCurrency === companyCurrency ? receivedAmount : 0,
    };
  }

  // Cross-currency: exactly ONE leg is company currency in the common case.
  if (paidCurrency === companyCurrency) {
    // Bank pays in UZS; counterparty gets foreign. UZS is sacred.
    const targetRate = deriveRate(paidAmount, receivedAmount);
    return {
      sourceExchangeRate: 1,
      targetExchangeRate: targetRate,
      basePaidAmount: paidAmount,
      baseReceivedAmount: paidAmount, // equals received * targetRate by construction
    };
  }

  if (receivedCurrency === companyCurrency) {
    // Foreign sent; UZS received. UZS is sacred.
    const sourceRate = deriveRate(receivedAmount, paidAmount);
    return {
      sourceExchangeRate: sourceRate,
      targetExchangeRate: 1,
      basePaidAmount: receivedAmount, // equals paid * sourceRate by construction
      baseReceivedAmount: receivedAmount,
    };
  }

  // Both legs foreign, neither is company currency. Caller must supply rates
  // to company currency directly — we can't derive without a third anchor.
  return {
    sourceExchangeRate: 0,
    targetExchangeRate: 0,
    basePaidAmount: 0,
    baseReceivedAmount: 0,
  };
}

/**
 * Assert a derived base amount matches its user input within 0.01 tolerance.
 * Used in pre-submit guards to catch Golden Rule regressions.
 */
export function assertBaseMatches(
  label: string,
  userBase: number,
  derivedBase: number,
  tolerance = 0.01,
): void {
  if (Math.abs(userBase - derivedBase) > tolerance) {
    throw new Error(
      `${label}: base-amount drift detected (user=${userBase}, derived=${derivedBase}). ` +
        "Rate must be derived from amounts, not the other way around.",
    );
  }
}
