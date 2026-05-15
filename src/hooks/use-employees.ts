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
        fields: [
          "name",
          "employee_name",
          "designation",
          "department",
          "status",
          "custom_hourly_cost",
          "custom_cost_classification",
        ],
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

export interface NewEmployeeInput {
  employee_name: string;
  gender: "Male" | "Female" | "Other";
  date_of_birth: string;
  date_of_joining: string;
  status: "Active" | "Inactive" | "Suspended" | "Left";
  company: string;
  department?: string;
  designation?: string;
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewEmployeeInput) => {
      // Frappe's /api/resource/Employee requires first_name separately from employee_name
      const parts = data.employee_name.trim().split(/\s+/);
      const first_name = parts[0];
      const last_name = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
      return frappe.createDoc<Employee>("Employee", {
        ...data,
        first_name,
        ...(last_name ? { last_name } : {}),
      } as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
