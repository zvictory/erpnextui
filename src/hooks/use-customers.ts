import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Customer, CustomerListItem } from "@/types/customer";
import type { CustomerFormValues } from "@/lib/schemas/customer-schema";

const PAGE_SIZE = 20;

export function useCustomerList(page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.customers.list(page, search, sort),
    queryFn: () =>
      frappe.getList<CustomerListItem>("Customer", {
        filters: search ? [["customer_name", "like", `%${search}%`]] : [],
        fields: ["name", "customer_name", "customer_type", "customer_group", "territory", "default_currency"],
        orderBy: sort || "customer_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
  });
}

export function useCustomerCount(search: string) {
  return useQuery({
    queryKey: queryKeys.customers.count(search),
    queryFn: () =>
      frappe.getCount("Customer", search ? [["customer_name", "like", `%${search}%`]] : []),
  });
}

export function useCustomer(name: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(name),
    queryFn: () => frappe.getDoc<Customer>("Customer", name),
    enabled: !!name,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomerFormValues) =>
      frappe.createDoc<Customer>("Customer", {
        doctype: "Customer",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<CustomerFormValues> }) => {
      const doc = await frappe.getDoc<Customer>("Customer", name);
      return frappe.save<Customer>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Customer", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
