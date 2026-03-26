import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Supplier, SupplierListItem } from "@/types/supplier";
import type { SupplierFormValues } from "@/lib/schemas/supplier-schema";

const PAGE_SIZE = 20;

export function useSupplierList(page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(page, search, sort),
    queryFn: () =>
      frappe.getList<SupplierListItem>("Supplier", {
        filters: search ? [["supplier_name", "like", `%${search}%`]] : [],
        fields: ["name", "supplier_name", "supplier_type", "supplier_group", "default_currency"],
        orderBy: sort || "supplier_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
  });
}

export function useSupplierCount(search: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.count(search),
    queryFn: () =>
      frappe.getCount("Supplier", search ? [["supplier_name", "like", `%${search}%`]] : []),
  });
}

export function useSupplier(name: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(name),
    queryFn: () => frappe.getDoc<Supplier>("Supplier", name),
    enabled: !!name,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierFormValues) =>
      frappe.createDoc<Supplier>("Supplier", {
        doctype: "Supplier",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<SupplierFormValues> }) => {
      const doc = await frappe.getDoc<Supplier>("Supplier", name);
      return frappe.save<Supplier>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Supplier", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
