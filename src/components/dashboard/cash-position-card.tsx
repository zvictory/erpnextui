"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyStore } from "@/stores/company-store";
import { useBankAccountsWithCurrency, useCurrencyMap } from "@/hooks/use-accounts";
import { formatCurrency, formatMultiCurrency } from "@/lib/formatters";

export function CashPositionCard() {
  const t = useTranslations("dashboard");
  const { company } = useCompanyStore();
  const { data: accounts, isLoading } = useBankAccountsWithCurrency(company);
  const { data: currencyMap } = useCurrencyMap();

  const { totalLine, accountsWithInfo } = useMemo(() => {
    if (!accounts || !currencyMap) return { totalLine: "", accountsWithInfo: [] };

    // Group balances by currency
    const byCurrency = new Map<string, number>();
    for (const acc of accounts) {
      const cur = acc.account_currency || "USD";
      byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + acc.balance);
    }

    const amounts = Array.from(byCurrency.entries()).map(([currency, value]) => ({
      currency,
      value,
    }));
    const line = formatMultiCurrency(amounts, currencyMap);

    const withInfo = accounts.map((acc) => {
      const cur = acc.account_currency || "USD";
      const info = currencyMap.get(cur);
      return {
        ...acc,
        formattedBalance: formatCurrency(acc.balance, info?.symbol ?? cur, info?.onRight ?? false),
      };
    });

    return { totalLine: line, accountsWithInfo: withInfo };
  }, [accounts, currencyMap]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-3 h-7 w-32" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("cashPosition")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{totalLine}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("totalCash")}</p>
        {accountsWithInfo.length > 0 && (
          <div className="mt-3 space-y-1 text-xs">
            {accountsWithInfo.map((acc) => (
              <div key={acc.name} className="flex justify-between">
                <span className="truncate text-muted-foreground">{acc.name}</span>
                <span className="ml-2 font-medium">{acc.formattedBalance}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
