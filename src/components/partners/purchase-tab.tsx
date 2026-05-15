"use client";

import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/formatters";
import { useUnpaidPurchaseInvoices } from "@/lib/api/partners";

interface PurchaseTabProps {
  supplierId: string;
}

export function PurchaseTab({ supplierId }: PurchaseTabProps) {
  const t = useTranslations("partners");
  const { data: invoices, isLoading } = useUnpaidPurchaseInvoices(supplierId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!invoices?.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t("noPartners")}</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.name}>
              <TableCell className="font-mono text-sm">{inv.name}</TableCell>
              <TableCell>
                {(() => {
                  try {
                    return format(parseISO(inv.posting_date), "dd/MM/yy");
                  } catch {
                    return inv.posting_date;
                  }
                })()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(inv.grand_total)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(inv.paid_amount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {inv.outstanding_amount > 0 ? (
                  <Badge
                    variant="outline"
                    className="font-mono text-yellow-700 border-yellow-300 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950/30"
                  >
                    {formatNumber(inv.outstanding_amount)}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="font-mono text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30"
                  >
                    0
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
