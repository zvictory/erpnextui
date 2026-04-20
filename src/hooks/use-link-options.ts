import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";

export interface LinkOptionItem {
  value: string;
  description?: string;
}

export function useLinkOptions(
  doctype: string,
  filters?: unknown[],
  descriptionField?: string,
  search?: string,
) {
  return useQuery({
    queryKey: [...queryKeys.linkOptions.list(doctype, filters, descriptionField), search ?? ""],
    queryFn: () => {
      const fields: string[] = ["name"];
      if (descriptionField) fields.push(descriptionField);

      const allFilters: unknown[] = [...(filters ?? [])];
      // Auto-filter disabled records for doctypes that support it
      const hasDisabledField = ["Customer", "Supplier", "Item"].includes(doctype);
      if (hasDisabledField && !allFilters.some((f) => Array.isArray(f) && f[0] === "disabled")) {
        allFilters.push(["disabled", "=", 0]);
      }
      // Server-side search: match name OR descriptionField
      if (search && search.length > 0) {
        if (descriptionField) {
          // Use or_filters for name + description search
          const searchFilters = [...(filters ?? [])];
          if (
            hasDisabledField &&
            !searchFilters.some((f) => Array.isArray(f) && f[0] === "disabled")
          ) {
            searchFilters.push(["disabled", "=", 0]);
          }
          return frappe.getList<Record<string, string>>(doctype, {
            fields,
            filters: searchFilters.length > 0 ? searchFilters : undefined,
            orFilters: [
              ["name", "like", `%${search}%`],
              [descriptionField, "like", `%${search}%`],
            ],
            limitPageLength: 50,
            orderBy: "name asc",
          });
        }
        allFilters.push(["name", "like", `%${search}%`]);
      }

      return frappe.getList<Record<string, string>>(doctype, {
        fields,
        filters: allFilters.length > 0 ? allFilters : undefined,
        limitPageLength: search ? 50 : 500,
        orderBy: "name asc",
      });
    },
    staleTime: search ? 30_000 : 10 * 60 * 1000,
    select: (data): LinkOptionItem[] =>
      data.map((d) => ({
        value: d.name,
        description: descriptionField ? d[descriptionField] : undefined,
      })),
  });
}
