import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Quotation, QuotationListItem } from "@/types/quotation";
import type { QuotationFormValues } from "@/lib/schemas/quotation-schema";

const PAGE_SIZE = 20;

export function useQuotationList(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.quotations.list(company, page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["party_name", "like", `%${search}%`]);
      }
      return frappe.getList<QuotationListItem>("Quotation", {
        filters,
        fields: [
          "name",
          "party_name",
          "customer_name",
          "transaction_date",
          "valid_till",
          "grand_total",
          "currency",
          "status",
          "docstatus",
        ],
        orderBy: sort || "transaction_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useQuotationCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.quotations.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["party_name", "like", `%${search}%`]);
      }
      return frappe.getCount("Quotation", filters);
    },
    enabled: !!company,
  });
}

export function useQuotation(name: string) {
  return useQuery({
    queryKey: queryKeys.quotations.detail(name),
    queryFn: () => frappe.getDoc<Quotation>("Quotation", name),
    enabled: !!name,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QuotationFormValues & { company: string }) =>
      frappe.createDoc<Quotation>("Quotation", {
        doctype: "Quotation",
        quotation_to: "Customer",
        ...data,
        items: data.items.map((item) => ({
          doctype: "Quotation Item",
          ...item,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

export function useUpdateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<QuotationFormValues> }) => {
      const doc = await frappe.getDoc<Quotation>("Quotation", name);
      return frappe.save<Quotation>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
        ...(data.items
          ? {
              items: data.items.map((item) => ({
                doctype: "Quotation Item",
                ...item,
              })),
            }
          : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

export function useSubmitQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<Quotation>("Quotation", name);
      return frappe.submit<Quotation>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

export function useCancelQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Quotation", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

export function useDeleteQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Quotation", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}
