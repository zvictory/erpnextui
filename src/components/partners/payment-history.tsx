"use client";

import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/formatters";
import { usePaymentHistory } from "@/lib/api/partners";

interface PaymentHistoryProps {
  customerId: string;
  supplierId: string;
}

export function PaymentHistoryTab({ customerId, supplierId }: PaymentHistoryProps) {
  const t = useTranslations("partners");
  const { data, isLoading } = usePaymentHistory(customerId, supplierId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const payments = data?.payments ?? [];
  const journals = data?.journals ?? [];

  // Merge and sort by date
  const entries = [
    ...payments.map((p) => ({
      key: p.name,
      date: p.posting_date,
      type: "payment" as const,
      description: p.payment_type === "Receive" ? `${p.party} paid` : `We paid ${p.party}`,
      amount: p.paid_amount,
      name: p.name,
    })),
    ...journals.map((j) => ({
      key: j.name,
      date: j.posting_date,
      type: "offset" as const,
      description: j.user_remark || "Offset",
      amount: j.total_debit,
      name: j.name,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t("noPartners")}</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center gap-3 p-3 rounded-lg border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {(() => {
                  try {
                    return format(parseISO(entry.date), "dd/MM/yy");
                  } catch {
                    return entry.date;
                  }
                })()}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  entry.type === "offset"
                    ? "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/30"
                    : ""
                }`}
              >
                {entry.type === "offset" ? "Offset" : "Payment"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{entry.name}</span>
            </div>
            <p className="text-sm truncate">{entry.description}</p>
          </div>
          <span className="font-mono tabular-nums text-sm font-medium">
            {formatNumber(entry.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
