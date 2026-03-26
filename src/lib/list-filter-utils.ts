import type { ListFilters } from "@/hooks/use-list-state";

/**
 * Convert ListFilters to Frappe API filter arrays.
 * Supports status and date range (dateFrom/dateTo).
 */
export function buildExtraFilters(
  filters: ListFilters,
  dateField: string = "posting_date",
): unknown[] {
  const result: unknown[] = [];

  if (filters.status) {
    result.push(["status", "=", filters.status]);
  }
  if (filters.dateFrom) {
    result.push([dateField, ">=", filters.dateFrom]);
  }
  if (filters.dateTo) {
    result.push([dateField, "<=", filters.dateTo]);
  }

  return result;
}
