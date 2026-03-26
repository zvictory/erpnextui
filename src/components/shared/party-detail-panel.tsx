"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InvoiceDetailDialog } from "@/components/shared/invoice-detail-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  FileText,
  BookOpen,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
  MoreHorizontal,
  Eye,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { usePartyLedger, usePartyLedgerCount } from "@/hooks/use-party-balances";
import type { GLEntry } from "@/types/gl-entry";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatInvoiceCurrency, cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { useCancelSalesInvoice } from "@/hooks/use-sales-invoices";
import { useCancelPurchaseInvoice } from "@/hooks/use-purchase-invoices";
import { useCancelPaymentEntry } from "@/hooks/use-payment-entries";
import { useCancelJournalEntry } from "@/hooks/use-journal-entries";
import type { CurrencyBalance } from "@/types/party-report";
import { useTranslations } from "next-intl";

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function getVoucherIcon(voucherType: string) {
  if (voucherType === "Sales Invoice" || voucherType === "Purchase Invoice") {
    return <FileText className="h-3.5 w-3.5" />;
  }
  if (voucherType === "Payment Entry") {
    return <CreditCard className="h-3.5 w-3.5" />;
  }
  if (voucherType === "Journal Entry") {
    return <BookOpen className="h-3.5 w-3.5" />;
  }
  return <Receipt className="h-3.5 w-3.5" />;
}

function getVoucherHref(voucherType: string, voucherNo: string): string | null {
  if (voucherType === "Sales Invoice") {
    return `/sales-invoices/${encodeURIComponent(voucherNo)}`;
  }
  if (voucherType === "Purchase Invoice") {
    return `/purchase-invoices/${encodeURIComponent(voucherNo)}`;
  }
  return null;
}

interface PartyDetailPanelProps {
  partyType: "Customer" | "Supplier";
  partyName: string;
  partyDisplayName: string;
  partyCurrency?: string;
  outstandingBalance: number | null;
  currencyBalances?: CurrencyBalance[];
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PartyDetailPanel({
  partyType,
  partyName,
  partyDisplayName,
  partyCurrency,
  outstandingBalance,
  currencyBalances = [],
  className,
  onEdit,
  onDelete,
}: PartyDetailPanelProps) {
  const tCommon = useTranslations("common");
  const tInvoices = useTranslations("invoices");
  const tCustomers = useTranslations("customers");
  const tVendors = useTranslations("vendors");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const [invoiceDialog, setInvoiceDialog] = useState<{
    open: boolean;
    voucherType: "Sales Invoice" | "Purchase Invoice";
    voucherNo: string;
  }>({ open: false, voucherType: "Sales Invoice", voucherNo: "" });
  const [sortAsc, setSortAsc] = useState(true);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<{
    voucherType: string;
    voucherNo: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { data: entries, isLoading } = usePartyLedger(partyType, partyName, company, ledgerPage);
  const { data: ledgerCount = 0 } = usePartyLedgerCount(partyType, partyName, company);
  const totalPages = Math.max(1, Math.ceil(ledgerCount / 50));

  // Compute balance from GL entries as fallback when balanceMap data is zero/missing
  const computedFromLedger = useMemo(() => {
    if (!entries?.length) return null;
    const byCurrency = new Map<string, number>();
    let baseTotal = 0;
    for (const e of entries) {
      const prev = byCurrency.get(e.account_currency) ?? 0;
      byCurrency.set(
        e.account_currency,
        prev + e.debit_in_account_currency - e.credit_in_account_currency,
      );
      baseTotal += e.debit - e.credit;
    }
    const balances: CurrencyBalance[] = Array.from(byCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .filter((b) => Math.abs(b.amount) > 0.005);
    return { balances, baseTotal };
  }, [entries]);

  // Use prop values, falling back to ledger-computed values when prop shows zero but entries exist
  const effectiveBalance =
    (outstandingBalance === 0 || outstandingBalance == null) && computedFromLedger
      ? computedFromLedger.baseTotal
      : outstandingBalance;
  const effectiveCurrencyBalances =
    currencyBalances.length === 0 && computedFromLedger
      ? computedFromLedger.balances
      : currencyBalances;

  const cancelSI = useCancelSalesInvoice();
  const cancelPI = useCancelPurchaseInvoice();
  const cancelPE = useCancelPaymentEntry();
  const cancelJE = useCancelJournalEntry();

  async function handleCancelConfirm() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const { voucherType, voucherNo } = cancelTarget;
      if (voucherType === "Sales Invoice") await cancelSI.mutateAsync(voucherNo);
      else if (voucherType === "Purchase Invoice") await cancelPI.mutateAsync(voucherNo);
      else if (voucherType === "Payment Entry") await cancelPE.mutateAsync(voucherNo);
      else if (voucherType === "Journal Entry") await cancelJE.mutateAsync({ name: voucherNo });
      toast.success("Cancelled successfully");
      setCancelTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setIsCancelling(false);
    }
  }

  // Group GL entries by voucher_no + account_currency, then compute running balance
  const displayEntries = useMemo(() => {
    if (!entries?.length) return [];

    // Merge split GL entries (e.g., payment allocated to multiple invoices)
    const groupKey = (e: GLEntry) => `${e.voucher_no}|${e.account_currency}`;
    const grouped = new Map<string, GLEntry>();
    for (const e of entries) {
      const key = groupKey(e);
      const existing = grouped.get(key);
      if (existing) {
        existing.debit += e.debit;
        existing.credit += e.credit;
        existing.debit_in_account_currency += e.debit_in_account_currency;
        existing.credit_in_account_currency += e.credit_in_account_currency;
      } else {
        grouped.set(key, { ...e });
      }
    }

    const merged = Array.from(grouped.values());
    const sorted = merged.sort((a, b) => a.posting_date.localeCompare(b.posting_date));
    const runningByCurrency = new Map<string, number>();
    const withBalance = sorted.map((e) => {
      const curr = e.account_currency;
      const prev = runningByCurrency.get(curr) ?? 0;
      const newBal = prev + e.debit_in_account_currency - e.credit_in_account_currency;
      runningByCurrency.set(curr, newBal);
      return { ...e, balance: newBal, balanceCurrency: curr };
    });
    return sortAsc ? withBalance : [...withBalance].reverse();
  }, [entries, sortAsc]);

  const formattedBalance =
    effectiveBalance != null
      ? formatCurrency(Math.abs(effectiveBalance), currencySymbol, symbolOnRight)
      : null;

  const balanceLabel = partyType === "Customer" ? tCustomers("receivable") : tVendors("payable");

  const newInvoiceHref =
    partyType === "Supplier"
      ? `/purchase-invoices/new?supplier=${encodeURIComponent(partyName)}`
      : `/sales-invoices/new?customer=${encodeURIComponent(partyName)}`;

  const newOrderHref =
    partyType === "Supplier"
      ? `/purchase-orders/new?supplier=${encodeURIComponent(partyName)}`
      : `/sales-orders/new?customer=${encodeURIComponent(partyName)}`;

  return (
    <>
      <div className={cn("h-full flex flex-col gap-0 min-h-0", className)}>
        {/* sr-only a11y title */}
        <span className="sr-only">
          {partyDisplayName} — {partyType} details
        </span>

        <div className="flex flex-col gap-4 p-6 pb-4">
          {/* Avatar + name/ID block + edit/delete */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {getInitials(partyDisplayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-base font-bold leading-tight truncate">{partyDisplayName}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate">{partyName}</span>
                <Badge variant="secondary" className="text-xs py-0 h-4">
                  {partyType === "Customer" ? tCustomers("customer") : tVendors("vendor")}
                </Badge>
                {partyCurrency && (
                  <Badge variant="outline" className="text-xs py-0 h-4 font-mono">
                    {partyCurrency}
                  </Badge>
                )}
              </div>
            </div>
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{tCommon("edit")}</span>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{tCommon("delete")}</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Balance card */}
          <Card>
            <CardContent className="p-4">
              {effectiveBalance == null ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {partyType === "Customer"
                        ? tCustomers("outstandingBalance")
                        : tVendors("outstandingBalance")}
                    </p>
                    {effectiveCurrencyBalances.length >= 1 ? (
                      <>
                        <div className="flex flex-col gap-0.5">
                          {effectiveCurrencyBalances.map((b) => {
                            const info = currencyMap?.get(b.currency);
                            return (
                              <p
                                key={b.currency}
                                className={cn(
                                  "font-bold tabular-nums",
                                  effectiveCurrencyBalances.length > 1 ? "text-lg" : "text-2xl",
                                  b.amount > 0
                                    ? "text-red-600"
                                    : b.amount < 0
                                      ? "text-green-600"
                                      : "",
                                )}
                              >
                                {formatInvoiceCurrency(Math.abs(b.amount), b.currency, info)}
                              </p>
                            );
                          })}
                        </div>
                        {effectiveCurrencyBalances.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-1.5 border-t pt-1.5">
                            {tInvoices("total")} ≈ {formattedBalance}
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className={
                          effectiveBalance > 0
                            ? "text-2xl font-bold text-red-600 tabular-nums"
                            : effectiveBalance < 0
                              ? "text-2xl font-bold text-green-600 tabular-nums"
                              : "text-2xl font-bold tabular-nums"
                        }
                      >
                        {formattedBalance}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {balanceLabel} · {tCommon("asOfToday")}
                    </p>
                  </div>
                  <div
                    className={
                      effectiveBalance > 0
                        ? "text-red-600"
                        : effectiveBalance < 0
                          ? "text-green-600"
                          : "text-muted-foreground"
                    }
                  >
                    {effectiveBalance > 0 ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : effectiveBalance < 0 ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={newOrderHref}>
                <Plus className="h-4 w-4 mr-1" />
                {tCommon("newOrder")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={newInvoiceHref}>
                <Plus className="h-4 w-4 mr-1" />
                {tCommon("newInvoice")}
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link
                href={
                  partyType === "Customer"
                    ? `/payments/receive?customer=${encodeURIComponent(partyName)}`
                    : `/payments/pay?supplier=${encodeURIComponent(partyName)}`
                }
              >
                {partyType === "Customer" ? tCustomers("receivePayment") : tVendors("makePayment")}
              </Link>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Ledger table */}
        <ScrollArea className="flex-1 px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => setSortAsc((v) => !v)}
                  >
                    {tCommon("date")}
                    {sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  </button>
                </TableHead>
                <TableHead>{tCommon("voucher")}</TableHead>
                <TableHead className="text-right">{tCommon("debitOriginal")}</TableHead>
                <TableHead className="text-right">{tCommon("creditOriginal")}</TableHead>
                <TableHead className="text-right">{tCommon("baseAmount")}</TableHead>
                <TableHead className="text-right">{tCommon("balance")}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : !displayEntries.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {tCommon("noTransactions")}
                  </TableCell>
                </TableRow>
              ) : (
                displayEntries.map((entry) => {
                  const href = getVoucherHref(entry.voucher_type, entry.voucher_no);
                  return (
                    <TableRow key={entry.name}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(entry.posting_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">
                            {getVoucherIcon(entry.voucher_type)}
                          </span>
                          <Badge variant="outline" className="text-xs font-normal">
                            {entry.voucher_type}
                          </Badge>
                        </div>
                        <div className="text-xs mt-0.5">
                          {href ? (
                            <button
                              type="button"
                              className="text-primary hover:underline text-left"
                              onClick={() =>
                                setInvoiceDialog({
                                  open: true,
                                  voucherType: entry.voucher_type as
                                    | "Sales Invoice"
                                    | "Purchase Invoice",
                                  voucherNo: entry.voucher_no,
                                })
                              }
                            >
                              {entry.voucher_no}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">{entry.voucher_no}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium tabular-nums">
                        {entry.debit_in_account_currency > 0
                          ? formatInvoiceCurrency(
                              entry.debit_in_account_currency,
                              entry.account_currency,
                              currencyMap?.get(entry.account_currency),
                            )
                          : ""}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium tabular-nums">
                        {entry.credit_in_account_currency > 0
                          ? formatInvoiceCurrency(
                              entry.credit_in_account_currency,
                              entry.account_currency,
                              currencyMap?.get(entry.account_currency),
                            )
                          : ""}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          entry.debit > 0
                            ? "text-red-600"
                            : entry.credit > 0
                              ? "text-green-600"
                              : "text-muted-foreground",
                        )}
                      >
                        {formatCurrency(
                          Math.max(entry.debit, entry.credit),
                          currencySymbol,
                          symbolOnRight,
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          entry.balance > 0
                            ? "text-red-600"
                            : entry.balance < 0
                              ? "text-green-600"
                              : "text-muted-foreground",
                        )}
                      >
                        {formatInvoiceCurrency(
                          Math.abs(entry.balance),
                          entry.balanceCurrency,
                          currencyMap?.get(entry.balanceCurrency),
                        )}
                      </TableCell>
                      <TableCell className="w-8 px-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(entry.voucher_type === "Sales Invoice" ||
                              entry.voucher_type === "Purchase Invoice") && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setInvoiceDialog({
                                    open: true,
                                    voucherType: entry.voucher_type as
                                      | "Sales Invoice"
                                      | "Purchase Invoice",
                                    voucherNo: entry.voucher_no,
                                  })
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setCancelTarget({
                                  voucherType: entry.voucher_type,
                                  voucherNo: entry.voucher_no,
                                })
                              }
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 pb-1">
              <span className="text-xs text-muted-foreground">
                {tCommon("page")} {ledgerPage} / {totalPages} ({ledgerCount})
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={ledgerPage <= 1}
                  onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                >
                  {tCommon("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={ledgerPage >= totalPages}
                  onClick={() => setLedgerPage((p) => Math.min(totalPages, p + 1))}
                >
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      <InvoiceDetailDialog
        open={invoiceDialog.open}
        onOpenChange={(open) => setInvoiceDialog((prev) => ({ ...prev, open }))}
        voucherType={invoiceDialog.voucherType}
        voucherNo={invoiceDialog.voucherNo}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel transaction?"
        description={
          cancelTarget
            ? `This will cancel ${cancelTarget.voucherType} ${cancelTarget.voucherNo}. This action cannot be undone.`
            : ""
        }
        confirmLabel="Cancel transaction"
        variant="destructive"
        onConfirm={handleCancelConfirm}
        loading={isCancelling}
      />
    </>
  );
}
