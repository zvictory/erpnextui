import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Fetch the exchange rate for a currency pair on a given date from ERPNext.
 * If no exact-date record exists, auto-syncs from CBU.uz for that date,
 * then falls back to the most recent rate on or before the requested date.
 * Returns rate as "1 fromCurrency = X toCurrency".
 */
export function useExchangeRate(fromCurrency: string, toCurrency: string, date: string) {
  const enabled = !!fromCurrency && !!toCurrency && fromCurrency !== toCurrency && !!date;

  return useQuery({
    queryKey: ["exchangeRate", fromCurrency, toCurrency, date],
    queryFn: async () => {
      const { siteUrl, csrfToken } = useAuthStore.getState();

      const fetchExact = async (from: string, to: string) => {
        const recs = await frappe.getList<{ exchange_rate: number }>("Currency Exchange", {
          filters: [
            ["from_currency", "=", from],
            ["to_currency", "=", to],
            ["date", "=", date],
          ],
          fields: ["exchange_rate"],
          limitPageLength: 1,
        });
        return recs.length > 0 ? recs[0].exchange_rate : null;
      };

      // 1. Try exact date for both directions
      const exactRate =
        (await fetchExact(fromCurrency, toCurrency)) ??
        (await fetchExact(toCurrency, fromCurrency).then((r) => (r ? 1 / r : null)));

      if (exactRate !== null) return exactRate;

      // 2. Exact record missing — sync this date from CBU.uz
      const cbuCurrencies = [fromCurrency, toCurrency].filter((c) => c !== "UZS");
      if (cbuCurrencies.length > 0 && siteUrl) {
        try {
          await fetch("/api/sync-rates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
            },
            credentials: "include",
            body: JSON.stringify({ siteUrl, currencies: cbuCurrencies, date }),
          });
        } catch {
          // Non-fatal: fall through to most-recent fallback
        }
      }

      // 3. Most recent on or before date (now finds the just-synced record)
      const fallback = await frappe.getList<{ exchange_rate: number }>("Currency Exchange", {
        filters: [
          ["from_currency", "=", fromCurrency],
          ["to_currency", "=", toCurrency],
          ["date", "<=", date],
        ],
        fields: ["exchange_rate"],
        orderBy: "date desc",
        limitPageLength: 1,
      });
      if (fallback.length > 0) return fallback[0].exchange_rate;

      // 4. Reverse fallback with inversion
      const reverseFallback = await frappe.getList<{ exchange_rate: number }>("Currency Exchange", {
        filters: [
          ["from_currency", "=", toCurrency],
          ["to_currency", "=", fromCurrency],
          ["date", "<=", date],
        ],
        fields: ["exchange_rate"],
        orderBy: "date desc",
        limitPageLength: 1,
      });
      if (reverseFallback.length > 0 && reverseFallback[0].exchange_rate > 0) {
        return 1 / reverseFallback[0].exchange_rate;
      }

      return null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
