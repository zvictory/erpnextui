import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { DeliveryNote, DeliveryNoteListItem } from "@/types/delivery-note";
import type { DeliveryNoteFormValues } from "@/lib/schemas/delivery-note-schema";

const PAGE_SIZE = 20;

export function useDeliveryNoteList(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.deliveryNotes.list(company, page, search, sort),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["customer", "like", `%${search}%`]);
      }
      return frappe.getList<DeliveryNoteListItem>("Delivery Note", {
        filters,
        fields: [
          "name",
          "customer",
          "posting_date",
          "grand_total",
          "currency",
          "status",
          "docstatus",
        ],
        orderBy: sort || "posting_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useDeliveryNoteCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.deliveryNotes.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["customer", "like", `%${search}%`]);
      }
      return frappe.getCount("Delivery Note", filters);
    },
    enabled: !!company,
  });
}

export function useDeliveryNote(name: string) {
  return useQuery({
    queryKey: queryKeys.deliveryNotes.detail(name),
    queryFn: () => frappe.getDoc<DeliveryNote>("Delivery Note", name),
    enabled: !!name,
  });
}

export function useCreateDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DeliveryNoteFormValues & { company: string }) =>
      frappe.createDoc<DeliveryNote>("Delivery Note", {
        doctype: "Delivery Note",
        ...data,
        items: data.items.map((item) => ({
          doctype: "Delivery Note Item",
          ...item,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveryNotes"] });
    },
  });
}

export function useUpdateDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<DeliveryNoteFormValues> }) => {
      const doc = await frappe.getDoc<DeliveryNote>("Delivery Note", name);
      return frappe.save<DeliveryNote>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
        ...(data.items
          ? {
              items: data.items.map((item) => ({
                doctype: "Delivery Note Item",
                ...item,
              })),
            }
          : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveryNotes"] });
    },
  });
}

export function useSubmitDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<DeliveryNote>("Delivery Note", name);
      return frappe.submit<DeliveryNote>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveryNotes"] });
    },
  });
}

export function useCancelDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Delivery Note", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveryNotes"] });
    },
  });
}

export function useDeleteDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Delivery Note", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveryNotes"] });
    },
  });
}
