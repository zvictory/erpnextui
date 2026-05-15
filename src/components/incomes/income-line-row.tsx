"use client";

import { cn } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import type { AccountWithCurrency } from "@/types/account";

interface IncomeLineRowProps {
  id: string;
  account: string;
  amount: number;
  memo: string;
  incomeAccounts: AccountWithCurrency[];
  onAccountChange: (id: string, value: string) => void;
  onAmountChange: (id: string, value: number) => void;
  onMemoChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function IncomeLineRow({
  id,
  account,
  amount,
  memo,
  incomeAccounts,
  onAccountChange,
  onAmountChange,
  onMemoChange,
  onRemove,
  canRemove,
}: IncomeLineRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <select
          value={account}
          onChange={(e) => onAccountChange(id, e.target.value)}
          className={cn(
            "h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !account && "text-muted-foreground",
          )}
        >
          <option value="">Select income account</option>
          {incomeAccounts.map((acc) => (
            <option key={acc.name} value={acc.name}>
              {acc.name} ({acc.account_currency})
            </option>
          ))}
        </select>

        <MoneyInput
          placeholder="0.00"
          value={amount}
          onChange={(v) => onAmountChange(id, v)}
          className="h-9 w-32 font-mono text-right"
        />

        <button
          type="button"
          onClick={() => onRemove(id)}
          disabled={!canRemove}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            canRemove
              ? "hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              : "opacity-30 cursor-not-allowed",
          )}
          aria-label="Remove line"
        >
          &times;
        </button>
      </div>

      <input
        type="text"
        placeholder="What is this for?"
        value={memo}
        onChange={(e) => onMemoChange(id, e.target.value)}
        className={cn(
          "h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "text-muted-foreground",
        )}
      />
    </div>
  );
}
