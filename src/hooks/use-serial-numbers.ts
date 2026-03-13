"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { SerialNumber, SerialNumberListItem } from "@/types/serial-number";

const PAGE_SIZE = 20;

const LIST_FIELDS: (keyof SerialNumberListItem)[] = [
  "name",
  "item_code",
  "item_name",
  "warehouse",
  "status",
  "custom_imei_1",
  "custom_imei_2",
];

export function useSerialNumberList(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.serialNumbers.list(company, page, search, sort),
    queryFn: async () => {
      if (!search) {
        return frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [["company", "=", company]],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
          limitStart: (page - 1) * PAGE_SIZE,
        });
      }

      const likeFilter = `%${search}%`;
      const [byName, byImei1, byImei2] = await Promise.all([
        frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [
            ["company", "=", company],
            ["name", "like", likeFilter],
          ],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
          limitStart: (page - 1) * PAGE_SIZE,
        }),
        frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [
            ["company", "=", company],
            ["custom_imei_1", "like", likeFilter],
          ],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
        }),
        frappe.getList<SerialNumberListItem>("Serial No", {
          filters: [
            ["company", "=", company],
            ["custom_imei_2", "like", likeFilter],
          ],
          fields: LIST_FIELDS as string[],
          orderBy: sort || "creation desc",
          limitPageLength: PAGE_SIZE,
        }),
      ]);

      const seen = new Set<string>();
      const merged: SerialNumberListItem[] = [];
      for (const item of [...byName, ...byImei1, ...byImei2]) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          merged.push(item);
        }
      }
      return merged.slice(0, PAGE_SIZE);
    },
    enabled: !!company,
  });
}

export function useSerialNumberCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.serialNumbers.count(company, search),
    queryFn: async () => {
      if (!search) {
        return frappe.getCount("Serial No", [["company", "=", company]]);
      }
      const likeFilter = `%${search}%`;
      const [c1, c2, c3] = await Promise.all([
        frappe.getCount("Serial No", [
          ["company", "=", company],
          ["name", "like", likeFilter],
        ]),
        frappe.getCount("Serial No", [
          ["company", "=", company],
          ["custom_imei_1", "like", likeFilter],
        ]),
        frappe.getCount("Serial No", [
          ["company", "=", company],
          ["custom_imei_2", "like", likeFilter],
        ]),
      ]);
      return c1 + c2 + c3;
    },
    enabled: !!company,
  });
}

export function useSerialNumber(name: string) {
  return useQuery({
    queryKey: queryKeys.serialNumbers.detail(name),
    queryFn: () => frappe.getDoc<SerialNumber>("Serial No", name),
    enabled: !!name,
  });
}

export function useCreateSerialNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      serial_no: string;
      item_code: string;
      company: string;
      custom_imei_1?: string;
      custom_imei_2?: string;
    }) =>
      frappe.createDoc<SerialNumber>("Serial No", {
        doctype: "Serial No",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["serialNumbers"] });
    },
  });
}

export function useUpdateSerialNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      data,
    }: {
      name: string;
      data: { custom_imei_1?: string; custom_imei_2?: string };
    }) => {
      return frappe.updateDoc<SerialNumber>("Serial No", name, data);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["serialNumbers"] });
      qc.invalidateQueries({
        queryKey: queryKeys.serialNumbers.detail(variables.name),
      });
    },
  });
}

export async function batchUpdateIMEI(
  updates: { serial_no: string; custom_imei_1?: string; custom_imei_2?: string }[],
): Promise<{ serial_no: string; success: boolean; error?: string }[]> {
  return Promise.all(
    updates.map(async ({ serial_no, ...data }) => {
      try {
        await frappe.updateDoc("Serial No", serial_no, data);
        return { serial_no, success: true };
      } catch (err) {
        return {
          serial_no,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }),
  );
}
