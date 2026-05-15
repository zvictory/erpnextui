"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/formatters";

interface BalanceSummaryProps {
  receivable: number;
  payable: number;
  currency?: string;
}

export function BalanceSummary({
  receivable,
  payable,
  currency: _currency = "UZS",
}: BalanceSummaryProps) {
  const t = useTranslations("partners");
  const net = receivable - payable;
  const direction = net > 0 ? "they_pay" : net < 0 ? "we_pay" : "settled";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">{t("receivable")}</p>
          <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
            {formatNumber(receivable)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">{t("payable")}</p>
          <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
            {formatNumber(payable)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">{t("netBalance")}</p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              direction === "they_pay"
                ? "text-green-600 dark:text-green-400"
                : direction === "we_pay"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
            }`}
          >
            {net > 0 ? "+" : net < 0 ? "-" : ""}
            {formatNumber(Math.abs(net))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {direction === "they_pay"
              ? t("theyPay")
              : direction === "we_pay"
                ? t("wePay")
                : t("settled")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
