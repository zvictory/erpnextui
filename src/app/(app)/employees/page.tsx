"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeListPanel } from "@/components/employees/employee-list-panel";
import { EmployeeDetailPanel } from "@/components/employees/employee-detail-panel";
import { EmployeeTransactionsPane } from "@/components/employees/employee-transactions-pane";
import { useEmployeeList, useEmployeeCount } from "@/hooks/use-employees";
import { useEmployeeGLBalances } from "@/hooks/use-employee-balances";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import type { EmployeeWithBalance } from "@/types/employee";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export type EmployeeSortBy = "name" | "balance";

export default function EmployeesPage() {
  const t = useTranslations("employees");
  const listState = useListState("employee_name asc");
  const { company } = useCompanyStore();
  const isMobile = useIsMobile();

  const { data: employees = [], isLoading } = useEmployeeList(
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useEmployeeCount(listState.debouncedSearch);
  const { balanceMap, isLoading: balancesLoading } = useEmployeeGLBalances(company);

  const [sortBy, setSortBy] = useState<EmployeeSortBy>("name");

  const employeesWithBalance = useMemo<EmployeeWithBalance[]>(() => {
    const list = employees.map((e) => {
      const pb = balanceMap.get(e.name);
      return {
        ...e,
        outstanding_balance: pb?.totalInBaseCurrency ?? 0,
        currency_balances: pb?.balances ?? [],
      };
    });
    if (sortBy === "balance") {
      return [...list].sort(
        (a, b) => Math.abs(b.outstanding_balance) - Math.abs(a.outstanding_balance),
      );
    }
    return list;
  }, [employees, balanceMap, sortBy]);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithBalance | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Derive effective selection — auto-pick first item if nothing is selected yet
  const effectiveSelectedEmployee =
    selectedEmployee ?? (employeesWithBalance.length > 0 ? employeesWithBalance[0] : null);

  const handleSelect = (emp: EmployeeWithBalance) => {
    setSelectedEmployee(emp);
    if (isMobile) setMobileSheetOpen(true);
  };

  const listRows = employeesWithBalance.map((e) => ({
    name: e.name,
    employee_name: e.employee_name,
    designation: e.designation,
    outstanding_balance: e.outstanding_balance,
    currency_balances: e.currency_balances,
    custom_hourly_cost: e.custom_hourly_cost,
    custom_cost_classification: e.custom_cost_classification,
  }));

  return (
    <>
      <div className="flex overflow-hidden -m-4 md:-m-6 h-[calc(100svh-3.5rem)]">
        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col border-r overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-sm font-semibold">{t("title")}</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/employees/salary-accrual">
                <CalendarCheck className="h-4 w-4 mr-1" />
                {t("salaryAccrual")}
              </Link>
            </Button>
          </div>
          <EmployeeListPanel
            employees={listRows}
            isLoading={isLoading}
            balancesLoading={balancesLoading}
            search={listState.search}
            onSearchChange={listState.setSearch}
            selectedName={effectiveSelectedEmployee?.name ?? null}
            onSelect={(row) => {
              const full = employeesWithBalance.find((e) => e.name === row.name);
              if (full) handleSelect(full);
            }}
            page={listState.page}
            totalCount={totalCount}
            pageSize={listState.pageSize}
            onNextPage={listState.nextPage}
            onPrevPage={listState.prevPage}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        <div className="hidden md:flex flex-1 overflow-hidden">
          {effectiveSelectedEmployee ? (
            <EmployeeDetailPanel
              employeeName={effectiveSelectedEmployee.name}
              employeeDisplayName={effectiveSelectedEmployee.employee_name}
              designation={effectiveSelectedEmployee.designation}
              department={effectiveSelectedEmployee.department}
              outstandingBalance={effectiveSelectedEmployee.outstanding_balance}
              currencyBalances={effectiveSelectedEmployee.currency_balances}
              className="w-full"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {t("selectToView")}
            </div>
          )}
        </div>
      </div>

      {effectiveSelectedEmployee && (
        <EmployeeTransactionsPane
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          employeeName={effectiveSelectedEmployee.name}
          employeeDisplayName={effectiveSelectedEmployee.employee_name}
          designation={effectiveSelectedEmployee.designation}
          department={effectiveSelectedEmployee.department}
          outstandingBalance={effectiveSelectedEmployee.outstanding_balance}
          currencyBalances={effectiveSelectedEmployee.currency_balances}
        />
      )}
    </>
  );
}
