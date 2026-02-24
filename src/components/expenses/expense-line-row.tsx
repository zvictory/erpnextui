"use client";

import { cn } from "@/lib/utils";

interface ExpenseLineRowProps {
  id: string;
  account: string;
  amount: string;
  expenseAccounts: string[];
  onAccountChange: (id: string, value: string) => void;
  onAmountChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function ExpenseLineRow({
  id,
  account,
  amount,
  expenseAccounts,
  onAccountChange,
  onAmountChange,
  onRemove,
  canRemove,
}: ExpenseLineRowProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={account}
        onChange={(e) => onAccountChange(id, e.target.value)}
        className={cn(
          "h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !account && "text-muted-foreground"
        )}
      >
        <option value="">Select expense account</option>
        {expenseAccounts.map((acc) => (
          <option key={acc} value={acc}>
            {acc}
          </option>
        ))}
      </select>

      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={amount}
        onChange={(e) => onAmountChange(id, e.target.value)}
        className={cn(
          "h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-xs text-right",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />

      <button
        type="button"
        onClick={() => onRemove(id)}
        disabled={!canRemove}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
          canRemove
            ? "hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            : "opacity-30 cursor-not-allowed"
        )}
        aria-label="Remove line"
      >
        &times;
      </button>
    </div>
  );
}
