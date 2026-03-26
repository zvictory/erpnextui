"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import type { RecentInvoice } from "@/types/dashboard";

const statusVariant: Record<
  RecentInvoice["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  Paid: "default",
  Unpaid: "secondary",
  Overdue: "destructive",
  Return: "outline",
  "Credit Note Issued": "outline",
};

interface RecentInvoicesProps {
  data: RecentInvoice[] | undefined;
  isLoading: boolean;
}

const statusKeyMap: Record<string, string> = {
  Paid: "paid",
  Unpaid: "unpaid",
  Overdue: "overdue",
  Return: "return",
  "Credit Note Issued": "creditNoteIssued",
};

export function RecentInvoices({ data, isLoading }: RecentInvoicesProps) {
  const t = useTranslations("dashboard");
  const tStatus = useTranslations("status");
  const { currencyCode, currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentInvoices")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoiceNo")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((invoice) => (
                <TableRow key={invoice.name}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/sales-invoices/${invoice.name}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {invoice.name}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.customer}</TableCell>
                  <TableCell>{formatDate(invoice.postingDate)}</TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      const cur = invoice.currency ?? currencyCode;
                      const info = currencyMap?.get(cur);
                      return formatCurrency(
                        invoice.grandTotal,
                        info?.symbol ?? currencySymbol,
                        info?.onRight ?? symbolOnRight,
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.status]}>
                      {statusKeyMap[invoice.status]
                        ? tStatus(statusKeyMap[invoice.status])
                        : invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noInvoices")}</p>
        )}
      </CardContent>
    </Card>
  );
}
