"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { useCompanyStore } from "@/stores/company-store";
import { queryKeys } from "@/hooks/query-keys";
import type { Company, Currency } from "@/types/company";

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: () =>
      frappe.getList<Company>("Company", {
        fields: ["name", "default_currency"],
      }),
  });
}

export function useCurrencyLookup(currencyCode: string) {
  const setCurrency = useCompanyStore((s) => s.setCurrency);

  const query = useQuery({
    queryKey: queryKeys.companies.currency(currencyCode),
    queryFn: () => frappe.getDoc<Currency>("Currency", currencyCode),
    enabled: !!currencyCode,
  });

  useEffect(() => {
    if (query.data) {
      setCurrency(query.data.symbol, !!query.data.symbol_on_right);
    }
  }, [query.data, setCurrency]);

  return query;
}
