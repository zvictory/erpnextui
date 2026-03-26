"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EmployeeDetailPanel } from "./employee-detail-panel";
import { useTranslations } from "next-intl";
import type { CurrencyBalance } from "@/types/party-report";

interface EmployeeTransactionsPaneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeeDisplayName: string;
  designation: string;
  department: string;
  outstandingBalance: number;
  currencyBalances: CurrencyBalance[];
  monthlySalary?: number;
}

export function EmployeeTransactionsPane({
  open,
  onOpenChange,
  employeeName,
  employeeDisplayName,
  designation,
  department,
  outstandingBalance,
  currencyBalances,
  monthlySalary,
}: EmployeeTransactionsPaneProps) {
  const t = useTranslations("employees");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0" side="right">
        <SheetHeader className="sr-only">
          <SheetTitle>{employeeDisplayName}</SheetTitle>
          <SheetDescription>
            {t("employee")} — {employeeName}
          </SheetDescription>
        </SheetHeader>

        <EmployeeDetailPanel
          employeeName={employeeName}
          employeeDisplayName={employeeDisplayName}
          designation={designation}
          department={department}
          outstandingBalance={outstandingBalance}
          currencyBalances={currencyBalances}
          monthlySalary={monthlySalary}
        />
      </SheetContent>
    </Sheet>
  );
}
