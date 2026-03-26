"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExpenseLineRow } from "@/components/expenses/expense-line-row";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency } from "@/lib/utils";
import type { AccountWithCurrency } from "@/types/account";

export interface ExpenseLine {
  id: string;
  account: string;
  amount: string;
}

interface ExpenseLinesProps {
  lines: ExpenseLine[];
  expenseAccounts: AccountWithCurrency[];
  onUpdate: (lines: ExpenseLine[]) => void;
  onOpenNewAccount: () => void;
  hideTotal?: boolean;
}

export function ExpenseLines({
  lines,
  expenseAccounts,
  onUpdate,
  onOpenNewAccount,
  hideTotal,
}: ExpenseLinesProps) {
  const t = useTranslations("expenses");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const handleAccountChange = (id: string, value: string) => {
    onUpdate(lines.map((line) => (line.id === id ? { ...line, account: value } : line)));
  };

  const handleAmountChange = (id: string, value: string) => {
    onUpdate(lines.map((line) => (line.id === id ? { ...line, amount: value } : line)));
  };

  const handleRemove = (id: string) => {
    if (lines.length <= 1) return;
    onUpdate(lines.filter((line) => line.id !== id));
  };

  const handleAddLine = () => {
    onUpdate([...lines, { id: crypto.randomUUID(), account: "", amount: "" }]);
  };

  const total = lines.reduce((sum, line) => {
    const val = parseFloat(line.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("account")}</Label>
        <Button type="button" variant="ghost" size="xs" onClick={onOpenNewAccount}>
          + New Account
        </Button>
      </div>

      <div className="space-y-2">
        {lines.map((line) => (
          <ExpenseLineRow
            key={line.id}
            id={line.id}
            account={line.account}
            amount={line.amount}
            expenseAccounts={expenseAccounts}
            onAccountChange={handleAccountChange}
            onAmountChange={handleAmountChange}
            onRemove={handleRemove}
            canRemove={lines.length > 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
        + {t("addLine")}
      </Button>

      {!hideTotal && (
        <div className="flex justify-end pt-2 border-t">
          <div className="text-sm font-medium">
            Total:{" "}
            <span className="font-mono">
              {formatCurrency(total, currencySymbol, symbolOnRight)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
