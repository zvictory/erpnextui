import { useQuery } from "@tanstack/react-query";
import { frappeCall } from "@/lib/frappe-client";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";

export function useSellingPriceList(company: string) {
  return useQuery({
    queryKey: queryKeys.companies.sellingPriceList(company),
    queryFn: async () => {
      const data = await frappeCall<{
        message: { default_selling_price_list?: string };
      }>("/api/method/frappe.client.get_value", {
        method: "POST",
        body: JSON.stringify({
          doctype: "Company",
          filters: { name: company },
          fieldname: "default_selling_price_list",
        }),
      });
      return data.message?.default_selling_price_list ?? "";
    },
    enabled: !!company,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSellingPriceLists() {
  return useQuery({
    queryKey: queryKeys.priceLists.selling,
    queryFn: () =>
      frappe.getList<{ name: string }>("Price List", {
        filters: [
          ["selling", "=", 1],
          ["enabled", "=", 1],
        ],
        fields: ["name"],
        limitPageLength: 0,
      }),
    staleTime: 10 * 60 * 1000,
  });
}
