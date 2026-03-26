import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";

interface ItemPriceEntry {
  price_list_rate: number;
  uom: string;
}

export function useItemPrice(itemCode: string, priceList: string, uom: string) {
  return useQuery({
    queryKey: queryKeys.itemPrices.forItem(itemCode, priceList),
    queryFn: () =>
      frappe.getList<ItemPriceEntry>("Item Price", {
        filters: [
          ["item_code", "=", itemCode],
          ["price_list", "=", priceList],
          ["selling", "=", 1],
        ],
        fields: ["price_list_rate", "uom"],
        limitPageLength: 0,
      }),
    enabled: !!itemCode && !!priceList,
    staleTime: 5 * 60 * 1000,
    select: (prices) => {
      const exactMatch = prices.find((p) => p.uom === uom);
      if (exactMatch) return exactMatch.price_list_rate;
      const defaultMatch = prices.find((p) => !p.uom);
      return defaultMatch?.price_list_rate ?? null;
    },
  });
}
