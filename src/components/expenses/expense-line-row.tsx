"use client";

import { cn } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import { formatNumber } from "@/lib/formatters";
import { useCurrencyMap } from "@/hooks/use-accounts";
import type { AccountWithCurrency, AssetWithCurrency } from "@/types/account";
import type { ExpenseMode } from "@/components/expenses/write-check-form";

interface ExpenseLineRowProps {
  id: string;
  account: string;
  amount: number;
  memo: string;
  asset?: string;
  mode?: ExpenseMode;
  assets?: AssetWithCurrency[];
  expenseAccounts: AccountWithCurrency[];
  onAccountChange: (id: string, value: string) => void;
  onAssetSelect?: (id: string, assetName: string, accountName: string) => void;
  onAmountChange: (id: string, value: number) => void;
  onMemoChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function ExpenseLineRow({
  id,
  account,
  amount,
  memo,
  asset,
  mode = "expense",
  assets = [],
  expenseAccounts,
  onAccountChange,
  onAssetSelect,
  onAmountChange,
  onMemoChange,
  onRemove,
  canRemove,
}: ExpenseLineRowProps) {
  const isAsset = mode === "asset";
  const { data: currencyMap } = useCurrencyMap();

  const symbolFor = (code: string) => {
    const entry = currencyMap?.get(code);
    return entry?.symbol ?? code;
  };

  const handleAssetChange = (value: string) => {
    if (!onAssetSelect) return;
    if (!value) {
      onAssetSelect(id, "", "");
      return;
    }
    const picked = assets.find((a) => a.name === value);
    if (!picked) return;
    onAssetSelect(id, picked.name, picked.asset_account);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {isAsset ? (
          <select
            value={asset ?? ""}
            onChange={(e) => handleAssetChange(e.target.value)}
            className={cn(
              "h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !asset && "text-muted-foreground",
            )}
          >
            <option value="">Select asset</option>
            {assets.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name} — {a.asset_name} ({formatNumber(a.gross_purchase_amount, 2)}{" "}
                {symbolFor(a.account_currency)})
              </option>
            ))}
          </select>
        ) : (
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
            <option value="">Select expense account</option>
            {expenseAccounts.map((acc) => (
              <option key={acc.name} value={acc.name}>
                {acc.name} ({acc.account_currency})
              </option>
            ))}
          </select>
        )}

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
