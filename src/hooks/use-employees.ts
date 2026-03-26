import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { Employee, EmployeeListItem } from "@/types/employee";

const PAGE_SIZE = 20;

export function useEmployeeList(page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.employees.list(page, search, sort),
    queryFn: () =>
      frappe.getList<EmployeeListItem>("Employee", {
        filters: search ? [["employee_name", "like", `%${search}%`]] : [],
        fields: ["name", "employee_name", "designation", "department", "status"],
        orderBy: sort || "employee_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      }),
  });
}

export function useEmployeeCount(search: string) {
  return useQuery({
    queryKey: queryKeys.employees.count(search),
    queryFn: () =>
      frappe.getCount("Employee", search ? [["employee_name", "like", `%${search}%`]] : []),
  });
}

export function useEmployee(name: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(name),
    queryFn: () => frappe.getDoc<Employee>("Employee", name),
    enabled: !!name,
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<Employee> }) => {
      const doc = await frappe.getDoc<Employee>("Employee", name);
      return frappe.save<Employee>({
        ...(doc as unknown as Record<string, unknown>),
        ...data,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
