"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExpenseLineRow } from "@/components/expenses/expense-line-row";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency } from "@/lib/utils";
import type { AccountWithCurrency, AssetWithCurrency } from "@/types/account";
import type { ExpenseMode } from "@/components/expenses/write-check-form";

export interface ExpenseLine {
  id: string;
  account: string;
  amount: number;
  memo: string;
  asset?: string;
}

interface ExpenseLinesProps {
  lines: ExpenseLine[];
  expenseAccounts: AccountWithCurrency[];
  assets?: AssetWithCurrency[];
  mode?: ExpenseMode;
  onUpdate: (lines: ExpenseLine[]) => void;
  onOpenNewAccount: () => void;
  hideTotal?: boolean;
  accountLabel?: string;
}

export function ExpenseLines({
  lines,
  expenseAccounts,
  assets = [],
  mode = "expense",
  onUpdate,
  onOpenNewAccount,
  hideTotal,
  accountLabel,
}: ExpenseLinesProps) {
  const t = useTranslations("expenses");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const handleAccountChange = (id: string, value: string) => {
    onUpdate(lines.map((line) => (line.id === id ? { ...line, account: value } : line)));
  };

  const handleAssetSelect = (id: string, assetName: string, accountName: string) => {
    onUpdate(
      lines.map((line) =>
        line.id === id ? { ...line, asset: assetName, account: accountName } : line,
      ),
    );
  };

  const handleAmountChange = (id: string, value: number) => {
    onUpdate(lines.map((line) => (line.id === id ? { ...line, amount: value } : line)));
  };

  const handleMemoChange = (id: string, value: string) => {
    onUpdate(lines.map((line) => (line.id === id ? { ...line, memo: value } : line)));
  };

  const handleRemove = (id: string) => {
    if (lines.length <= 1) return;
    onUpdate(lines.filter((line) => line.id !== id));
  };

  const handleAddLine = () => {
    onUpdate([...lines, { id: crypto.randomUUID(), account: "", amount: 0, memo: "" }]);
  };

  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{accountLabel ?? t("account")}</Label>
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
            memo={line.memo}
            asset={line.asset}
            mode={mode}
            assets={assets}
            expenseAccounts={expenseAccounts}
            onAccountChange={handleAccountChange}
            onAssetSelect={handleAssetSelect}
            onAmountChange={handleAmountChange}
            onMemoChange={handleMemoChange}
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
