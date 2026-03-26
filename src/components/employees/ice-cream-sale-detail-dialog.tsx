"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import { useSalesInvoice } from "@/hooks/use-sales-invoices";
import { useCancelIceCreamSale } from "@/hooks/use-journal-entries";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { formatInvoiceCurrency, formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

interface IceCreamFormValues {
  posting_date: string;
  items: {
    item_code: string;
    qty: number;
    rate: number;
    amount: number;
    uom: string;
    discount_percentage: number;
    discount_amount: number;
  }[];
}

interface IceCreamSaleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siName: string;
  jeName: string;
  employee: string;
  employeeName: string;
  company: string;
  onAmend: (items: IceCreamFormValues) => void;
}

export function IceCreamSaleDetailDialog({
  open,
  onOpenChange,
  siName,
  jeName,
  employeeName,
  onAmend,
}: IceCreamSaleDetailDialogProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const tInvoices = useTranslations("invoices");
  const { data: si, isLoading } = useSalesInvoice(open ? siName : "");
  const { data: currencyMap } = useCurrencyMap();
  const cancelSale = useCancelIceCreamSale();

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [amendAfterCancel, setAmendAfterCancel] = useState(false);

  const isCancelled = si?.docstatus === 2;
  const currency = si?.currency ?? "USD";
  const currencyInfo = currencyMap?.get(currency);

  const handleCancel = (amend: boolean) => {
    setAmendAfterCancel(amend);
    setConfirmingCancel(true);
  };

  const executeCancel = () => {
    cancelSale.mutate(
      { jeName, siName },
      {
        onSuccess: () => {
          toast.success(t("saleCancelled"));
          setConfirmingCancel(false);
          if (amendAfterCancel && si) {
            const values: IceCreamFormValues = {
              posting_date: si.posting_date,
              items: si.items.map((item) => ({
                item_code: item.item_code,
                qty: item.qty,
                rate: item.rate,
                amount: item.amount,
                uom: item.uom ?? "",
                discount_percentage: item.discount_percentage ?? 0,
                discount_amount: item.discount_amount ?? 0,
              })),
            };
            onOpenChange(false);
            onAmend(values);
          } else {
            onOpenChange(false);
          }
        },
        onError: (err) => {
          toast.error(err.message);
          setConfirmingCancel(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setConfirmingCancel(false);
          setAmendAfterCancel(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("viewSale")}
            {si && <DocstatusBadge docstatus={si.docstatus} status={si.status} />}
          </DialogTitle>
          <DialogDescription>
            {siName} — {employeeName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : si ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{tCommon("date")}:</span>
              <span>{formatDate(si.posting_date)}</span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tInvoices("item")}</TableHead>
                  <TableHead className="text-right">{tInvoices("qty")}</TableHead>
                  <TableHead className="text-right">{tInvoices("rate")}</TableHead>
                  <TableHead className="text-right">{tInvoices("total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {si.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {item.item_name || item.item_code}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInvoiceCurrency(item.rate, currency, currencyInfo)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInvoiceCurrency(item.amount, currency, currencyInfo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between pt-1 border-t">
              <span className="font-medium">{tInvoices("grandTotal")}</span>
              <span className="font-bold tabular-nums">
                {formatInvoiceCurrency(si.grand_total, currency, currencyInfo)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("viewJournalEntry")}: {jeName}
            </p>

            {confirmingCancel ? (
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <p className="text-sm text-muted-foreground flex-1">{t("confirmCancelSale")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelSale.isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={executeCancel}
                  disabled={cancelSale.isPending}
                >
                  {cancelSale.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {tCommon("confirm")}
                </Button>
              </div>
            ) : !isCancelled ? (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="destructive" size="sm" onClick={() => handleCancel(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCancel(true)}>
                  {t("amendSale")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
