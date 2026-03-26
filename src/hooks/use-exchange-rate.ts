import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";

/**
 * Fetch the exchange rate for a currency pair on a given date from ERPNext.
 * Falls back to the most recent rate on or before that date.
 * Returns rate as "1 fromCurrency = X toCurrency".
 */
export function useExchangeRate(fromCurrency: string, toCurrency: string, date: string) {
  const enabled = !!fromCurrency && !!toCurrency && fromCurrency !== toCurrency && !!date;

  return useQuery({
    queryKey: ["exchangeRate", fromCurrency, toCurrency, date],
    queryFn: async () => {
      // Try exact date first, then fall back to most recent before date
      const records = await frappe.getList<{
        exchange_rate: number;
        date: string;
      }>("Currency Exchange", {
        filters: [
          ["from_currency", "=", fromCurrency],
          ["to_currency", "=", toCurrency],
          ["date", "<=", date],
        ],
        fields: ["exchange_rate", "date"],
        orderBy: "date desc",
        limitPageLength: 1,
      });

      if (records.length > 0) {
        return records[0].exchange_rate;
      }

      // Try reverse pair (to → from) and invert
      const reverse = await frappe.getList<{
        exchange_rate: number;
        date: string;
      }>("Currency Exchange", {
        filters: [
          ["from_currency", "=", toCurrency],
          ["to_currency", "=", fromCurrency],
          ["date", "<=", date],
        ],
        fields: ["exchange_rate", "date"],
        orderBy: "date desc",
        limitPageLength: 1,
      });

      if (reverse.length > 0 && reverse[0].exchange_rate > 0) {
        return 1 / reverse[0].exchange_rate;
      }

      return null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
