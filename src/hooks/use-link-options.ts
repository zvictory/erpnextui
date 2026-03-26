import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";

export interface LinkOptionItem {
  value: string;
  description?: string;
}

export function useLinkOptions(doctype: string, filters?: unknown[], descriptionField?: string) {
  return useQuery({
    queryKey: queryKeys.linkOptions.list(doctype, filters, descriptionField),
    queryFn: () => {
      const fields: string[] = ["name"];
      if (descriptionField) fields.push(descriptionField);
      return frappe.getList<Record<string, string>>(doctype, {
        fields,
        filters,
        limitPageLength: 500,
        orderBy: "name asc",
      });
    },
    staleTime: 10 * 60 * 1000,
    select: (data): LinkOptionItem[] =>
      data.map((d) => ({
        value: d.name,
        description: descriptionField ? d[descriptionField] : undefined,
      })),
  });
}
