import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { EmployeeAdvance, EmployeeAdvanceListItem } from "@/types/employee-advance";
import type { EmployeeAdvanceFormValues } from "@/lib/schemas/employee-advance-schema";

export function useEmployeeAdvanceList(employee: string, company: string) {
  return useQuery({
    queryKey: queryKeys.employeeAdvances.list(employee, company),
    queryFn: () =>
      frappe.getList<EmployeeAdvanceListItem>("Employee Advance", {
        filters: [
          ["employee", "=", employee],
          ["company", "=", company],
        ],
        fields: [
          "name",
          "employee",
          "employee_name",
          "posting_date",
          "advance_amount",
          "paid_amount",
          "claimed_amount",
          "return_amount",
          "purpose",
          "status",
          "docstatus",
          "currency",
        ],
        orderBy: "posting_date desc",
        limitPageLength: 100,
      }),
    enabled: !!employee && !!company,
  });
}

export function useEmployeeAdvance(name: string) {
  return useQuery({
    queryKey: queryKeys.employeeAdvances.detail(name),
    queryFn: () => frappe.getDoc<EmployeeAdvance>("Employee Advance", name),
    enabled: !!name,
  });
}

export function useCreateEmployeeAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeAdvanceFormValues & { company: string }) =>
      frappe.createDoc<EmployeeAdvance>("Employee Advance", {
        doctype: "Employee Advance",
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employeeAdvances"] });
    },
  });
}

export function useSubmitEmployeeAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<EmployeeAdvance>("Employee Advance", name);
      return frappe.submit<EmployeeAdvance>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employeeAdvances"] });
    },
  });
}

export function useCancelEmployeeAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Employee Advance", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employeeAdvances"] });
    },
  });
}
