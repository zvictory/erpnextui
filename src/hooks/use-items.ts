import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Item, ItemListItem } from "@/types/item";
import type { ItemFormValues } from "@/lib/schemas/item-schema";

const PAGE_SIZE = 20;

export function useItemList(page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.items.list(page, search, sort),
    queryFn: () =>
      frappe.getList<ItemListItem>("Item", {
        filters: search ? [["item_code", "like", `%${search}%`]] : [],
        fields: [
          "name",
          "item_code",
          "item_name",
          "item_group",
          "standard_rate",
          "has_serial_no",
          "disabled",
        ],
        orderBy: sort || "item_code asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useItemCount(search: string) {
  return useQuery({
    queryKey: queryKeys.items.count(search),
    queryFn: () => frappe.getCount("Item", search ? [["item_code", "like", `%${search}%`]] : []),
  });
}

export function useItem(name: string) {
  return useQuery({
    queryKey: queryKeys.items.detail(name),
    queryFn: () => frappe.getDoc<Item>("Item", name),
    enabled: !!name,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ItemFormValues) =>
      frappe.createDoc<Item>("Item", {
        doctype: "Item",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<ItemFormValues> }) => {
      const doc = await frappe.getDoc<Item>("Item", name);
      return frappe.save<Item>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Item", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
