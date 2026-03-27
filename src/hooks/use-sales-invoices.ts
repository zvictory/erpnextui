import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { SalesInvoice, SalesInvoiceListItem } from "@/types/sales-invoice";
import type { SalesInvoiceSubmitValues } from "@/lib/schemas/sales-invoice-schema";

const PAGE_SIZE = 20;

export function useSalesInvoiceList(
  company: string,
  page: number,
  search: string,
  sort: string,
  extraFilters?: unknown[],
) {
  return useQuery({
    queryKey: [...queryKeys.salesInvoices.list(company, page, search, sort), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["customer_name", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getList<SalesInvoiceListItem>("Sales Invoice", {
        filters,
        fields: [
          "name",
          "customer",
          "customer_name",
          "posting_date",
          "grand_total",
          "currency",
          "status",
          "docstatus",
          "is_return",
        ],
        orderBy: sort || "posting_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useSalesInvoiceCount(company: string, search: string, extraFilters?: unknown[]) {
  return useQuery({
    queryKey: [...queryKeys.salesInvoices.count(company, search), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["customer_name", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getCount("Sales Invoice", filters);
    },
    enabled: !!company,
  });
}

export function useSalesInvoice(name: string) {
  return useQuery({
    queryKey: queryKeys.salesInvoices.detail(name),
    queryFn: () => frappe.getDoc<SalesInvoice>("Sales Invoice", name),
    enabled: !!name,
  });
}

export function useCreateSalesInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: SalesInvoiceSubmitValues & { company: string; is_return?: 1; return_against?: string },
    ) => {
      // Find the receivable account matching the invoice currency
      let debitTo: string | undefined;
      if (data.currency && data.customer) {
        try {
          // Use ERPNext's built-in party account resolution
          const result = await frappe.call<string>(
            "erpnext.accounts.party.get_party_account",
            { party_type: "Customer", party: data.customer, company: data.company },
          );
          if (result) debitTo = result;
        } catch {
          // Fallback: query by currency
          const accounts = await frappe.getList<{ name: string }>("Account", {
            filters: [
              ["account_type", "=", "Receivable"],
              ["company", "=", data.company],
              ["account_currency", "=", data.currency],
              ["is_group", "=", 0],
            ],
            fields: ["name"],
            limitPageLength: 1,
          });
          if (accounts.length > 0) debitTo = accounts[0].name;
        }
      }

      return frappe.createDoc<SalesInvoice>("Sales Invoice", {
        doctype: "Sales Invoice",
        update_stock: 1,
        set_posting_time: 1,
        ...data,
        ...(debitTo ? { debit_to: debitTo } : {}),
        items: data.items.map((item) => ({
          doctype: "Sales Invoice Item",
          ...item,
        })),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
    },
  });
}

export function useUpdateSalesInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      data,
    }: {
      name: string;
      data: Partial<SalesInvoiceSubmitValues>;
    }) => {
      const doc = await frappe.getDoc<SalesInvoice>("Sales Invoice", name);
      return frappe.save<SalesInvoice>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
        set_posting_time: 1,
        ...(data.items
          ? {
              items: data.items.map((item) => ({
                doctype: "Sales Invoice Item",
                ...item,
              })),
            }
          : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
    },
  });
}

export function useSubmitSalesInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<SalesInvoice>("Sales Invoice", name);
      return frappe.submit<SalesInvoice>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
    },
  });
}

export function useCancelSalesInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Sales Invoice", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
    },
  });
}

export function useDeleteSalesInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Sales Invoice", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
    },
  });
}
