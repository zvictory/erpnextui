"use client";
import { useTranslations } from "next-intl";
import { useEmployees, useMonth } from "@/lib/attendance/data";
import { PayrollCard } from "@/components/attendance/payroll/payroll-card";

interface EmployeePayrollPaneProps {
  employeeName: string | null;
}

export function EmployeePayrollPane({ employeeName }: EmployeePayrollPaneProps) {
  const t = useTranslations("attendance");
  const employees = useEmployees();
  const target = employeeName?.trim().toLowerCase() ?? null;
  const emp = target ? employees.find((e) => e.name.trim().toLowerCase() === target) ?? null : null;
  const month = useMonth(emp);

  if (!emp || !month) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/40 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
        {t("emptyState.noDemoData")}
      </div>
    );
  }

  return <PayrollCard emp={emp} month={month} />;
}
