"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatInvoiceCurrency } from "@/lib/formatters";
import { useCurrencyMap } from "@/hooks/use-accounts";

interface InsufficientBalanceWarningProps {
  balance: number;
  amount: number;
  currency: string;
}

export function InsufficientBalanceWarning({
  balance,
  amount,
  currency,
}: InsufficientBalanceWarningProps) {
  const tCommon = useTranslations("common");
  const { data: currencyMap } = useCurrencyMap();

  if (amount <= 0 || amount <= balance) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
      <AlertTriangle className="size-4 shrink-0" />
      <span>
        {tCommon("insufficientBalance", {
          balance: formatInvoiceCurrency(balance, currency, currencyMap?.get(currency)),
        })}
      </span>
    </div>
  );
}
