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
import {
  CreditCard,
  FileText,
  BookOpen,
  Receipt,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
  MoreHorizontal,
  Eye,
  XCircle,
  Handshake,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { usePartyLedger } from "@/hooks/use-party-balances";
import type { GLEntry } from "@/types/gl-entry";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatInvoiceCurrency, cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { frappe } from "@/lib/frappe-client";
import { useCancelSalesInvoice } from "@/hooks/use-sales-invoices";
import { useCancelPurchaseInvoice } from "@/hooks/use-purchase-invoices";
import { useCancelPaymentEntry } from "@/hooks/use-payment-entries";
import { useCancelJournalEntry } from "@/hooks/use-journal-entries";

// Chunk size for ["name", "in", [...]] filters — keeps the proxied URL well under
// nginx's ~8KB header buffer even with long ACC-XXX-2026-NNNNN identifiers.
const IN_FILTER_CHUNK = 50;

async function fetchByNames<T>(
  doctype: string,
  names: string[],
  fields: string[],
): Promise<T[]> {
  if (names.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += IN_FILTER_CHUNK) {
    chunks.push(names.slice(i, i + IN_FILTER_CHUNK));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      frappe.getList<T>(doctype, {
        filters: [["name", "in", chunk]],
        fields,
        limitPageLength: chunk.length,
      }),
    ),
  );
  return results.flat();
}
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
  const enc = encodeURIComponent(voucherNo);
  switch (voucherType) {
    case "Sales Invoice":
      return `/sales-invoices/${enc}`;
    case "Purchase Invoice":
      return `/purchase-invoices/${enc}`;
    case "Sales Order":
      return `/sales-orders/${enc}`;
    case "Purchase Order":
      return `/purchase-orders/${enc}`;
    case "Delivery Note":
      return `/delivery-notes/${enc}`;
    case "Payment Entry":
      return `/payments/${enc}`;
    default:
      return null;
  }
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
  const [cancelTarget, setCancelTarget] = useState<{
    voucherType: string;
    voucherNo: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { data: entries, isLoading } = usePartyLedger(partyType, partyName, company);

  // Recent submitted orders (not in GL ledger)
  const invoiceDoctype = partyType === "Customer" ? "Sales Invoice" : "Purchase Invoice";
  const orderDoctype = partyType === "Customer" ? "Sales Order" : "Purchase Order";
  const partyField = partyType === "Customer" ? "customer" : "supplier";
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["recentOrders", orderDoctype, partyName, company],
    queryFn: () =>
      frappe.getList<{
        name: string;
        transaction_date: string;
        grand_total: number;
        currency: string;
        status: string;
        per_billed: number;
        per_delivered: number;
      }>(orderDoctype, {
        filters: [
          [partyField, "=", partyName],
          ["company", "=", company],
          ["docstatus", "=", 1],
        ],
        fields: [
          "name",
          "transaction_date",
          "grand_total",
          "currency",
          "status",
          "per_billed",
          "per_delivered",
        ],
        orderBy: "transaction_date desc",
        limitPageLength: 20,
      }),
    enabled: !!partyName && !!company,
  });

  // Check if this party has a linked partner
  const partnerLinkField =
    partyType === "Customer" ? "custom_linked_supplier" : "custom_linked_customer";
  const { data: partnerLink } = useQuery({
    queryKey: ["partnerLink", partyType, partyName],
    queryFn: async () => {
      const doc = await frappe.getDoc<Record<string, unknown>>(partyType, partyName);
      return (doc[partnerLinkField] as string) || null;
    },
    enabled: !!partyName,
  });

  // Compute balance from GL entries as fallback when balanceMap data is zero/missing
  const computedFromLedger = useMemo(() => {
    if (!entries?.length) return null;
    const byCurrency = new Map<string, number>();
    let baseTotal = 0;
    for (const e of entries) {
      const prev = byCurrency.get(e.account_currency) ?? 0;
      const dr =
        e.account_currency === "UZS"
          ? Math.round(e.debit_in_account_currency)
          : e.debit_in_account_currency;
      const cr =
        e.account_currency === "UZS"
          ? Math.round(e.credit_in_account_currency)
          : e.credit_in_account_currency;
      byCurrency.set(e.account_currency, prev + dr - cr);
      baseTotal += e.debit - e.credit;
    }
    const balances: CurrencyBalance[] = Array.from(byCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .filter((b) => Math.abs(b.amount) > 0.005);
    return { balances, baseTotal };
  }, [entries]);

  const effectiveBalance =
    (outstandingBalance === 0 || outstandingBalance == null) && computedFromLedger
      ? computedFromLedger.baseTotal
      : outstandingBalance;

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
  // Fetch actual Payment Entry amounts to correct GL rounding artifacts
  const peVouchers = useMemo(
    () =>
      (entries ?? [])
        .filter((e) => e.voucher_type === "Payment Entry")
        .map((e) => e.voucher_no)
        .filter((v, i, a) => a.indexOf(v) === i),
    [entries],
  );
  interface PEAmountInfo {
    paid_amount: number;
    received_amount: number;
    paid_from_account_currency: string;
    paid_to_account_currency: string;
  }
  const { data: peAmounts } = useQuery({
    queryKey: ["peAmounts", ...peVouchers],
    queryFn: () =>
      fetchByNames<{
        name: string;
        paid_amount: number;
        received_amount: number;
        paid_from_account_currency: string;
        paid_to_account_currency: string;
      }>("Payment Entry", peVouchers, [
        "name",
        "paid_amount",
        "received_amount",
        "paid_from_account_currency",
        "paid_to_account_currency",
      ]),
    enabled: peVouchers.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  const peAmountMap = useMemo(
    () => new Map<string, PEAmountInfo>((peAmounts ?? []).map((p) => [p.name, p])),
    [peAmounts],
  );

  // Fetch invoice currency + grand_total so "Original" columns show party currency
  const invoiceVouchers = useMemo(
    () =>
      (entries ?? [])
        .filter((e) => e.voucher_type === "Purchase Invoice" || e.voucher_type === "Sales Invoice")
        .map((e) => e.voucher_no)
        .filter((v, i, a) => a.indexOf(v) === i),
    [entries],
  );
  interface InvoiceCurrencyInfo {
    name: string;
    currency: string;
    grand_total: number;
  }
  const { data: invoiceCurrencyData } = useQuery({
    queryKey: ["invoiceCurrency", partyType, ...invoiceVouchers],
    queryFn: () => {
      const doctype = partyType === "Supplier" ? "Purchase Invoice" : "Sales Invoice";
      return fetchByNames<InvoiceCurrencyInfo>(doctype, invoiceVouchers, [
        "name",
        "currency",
        "grand_total",
      ]);
    },
    enabled: invoiceVouchers.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  const invoiceCurrencyMap = useMemo(
    () =>
      new Map<string, InvoiceCurrencyInfo>(
        (invoiceCurrencyData ?? []).map((inv) => [inv.name, inv]),
      ),
    [invoiceCurrencyData],
  );

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
    // Enrich amounts: replace account-currency values with original voucher currency
    for (const e of merged) {
      if (e.voucher_type === "Payment Entry") {
        // Use actual paid/received amount from PE (avoids exchange rate rounding)
        const pe = peAmountMap.get(e.voucher_no);
        if (pe) {
          let actual: number | undefined;
          if (e.account_currency === pe.paid_from_account_currency) {
            actual = pe.paid_amount;
          } else if (e.account_currency === pe.paid_to_account_currency) {
            actual = pe.received_amount;
          }
          if (actual != null) {
            if (e.credit_in_account_currency > 0) e.credit_in_account_currency = actual;
            if (e.debit_in_account_currency > 0) e.debit_in_account_currency = actual;
          }
        }
      } else if (e.voucher_type === "Purchase Invoice" || e.voucher_type === "Sales Invoice") {
        // Replace account-currency amounts with the invoice's original currency
        const inv = invoiceCurrencyMap.get(e.voucher_no);
        if (inv && inv.currency !== e.account_currency) {
          e.account_currency = inv.currency;
          if (e.debit_in_account_currency > 0) e.debit_in_account_currency = inv.grand_total;
          if (e.credit_in_account_currency > 0) e.credit_in_account_currency = inv.grand_total;
        }
        if (e.account_currency === "UZS") {
          e.debit_in_account_currency = Math.round(e.debit_in_account_currency);
          e.credit_in_account_currency = Math.round(e.credit_in_account_currency);
        }
      } else if (e.account_currency === "UZS") {
        e.debit_in_account_currency = Math.round(e.debit_in_account_currency);
        e.credit_in_account_currency = Math.round(e.credit_in_account_currency);
      }
    }
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
  }, [entries, sortAsc, peAmountMap, invoiceCurrencyMap]);

  // Use corrected ledger balance (with PE amount fixes) for the balance card
  const ledgerFinalBalances = useMemo(() => {
    if (!displayEntries.length) return null;
    const ascending = sortAsc ? displayEntries : [...displayEntries].reverse();
    const byCurrency = new Map<string, number>();
    for (const e of ascending) {
      byCurrency.set(e.balanceCurrency, e.balance);
    }
    const balances: CurrencyBalance[] = Array.from(byCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .filter((b) => Math.abs(b.amount) > 0.005);
    return balances;
  }, [displayEntries, sortAsc]);

  // Prefer ledger-derived balances (enriched with invoice currency data) because
  // the AP/AR report returns amounts in the payable/receivable account currency,
  // which may differ from the invoice currency (e.g. USD account but UZS invoices).
  // Fall back to the parent-supplied report balances while the ledger is loading.
  const effectiveCurrencyBalances =
    ledgerFinalBalances && ledgerFinalBalances.length > 0
      ? ledgerFinalBalances
      : currencyBalances.length > 0
        ? currencyBalances
        : (computedFromLedger?.balances ?? []);

  const formattedBalance =
    effectiveBalance != null
      ? formatCurrency(Math.abs(effectiveBalance), currencySymbol, symbolOnRight)
      : null;

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
      <div className={cn("h-full flex flex-col min-h-0", className)}>
        {/* ── Compact header: name + balance + actions ── */}
        <div className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                {getInitials(partyDisplayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold truncate">{partyDisplayName}</span>
                {partyCurrency && (
                  <Badge variant="outline" className="text-[10px] py-0 h-3.5 font-mono shrink-0">
                    {partyCurrency}
                  </Badge>
                )}
                {partnerLink && (
                  <Link
                    href={`/partners/${encodeURIComponent(partyType === "Customer" ? partyName : partnerLink)}`}
                  >
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-3.5 text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/30 cursor-pointer shrink-0"
                    >
                      <Handshake className="size-2.5 mr-0.5" />
                      Partner
                    </Badge>
                  </Link>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{partyName}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Balance — compact inline */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-baseline gap-2 min-w-0">
              {effectiveCurrencyBalances.length >= 1 ? (
                effectiveCurrencyBalances.map((b) => {
                  const info = currencyMap?.get(b.currency);
                  return (
                    <span
                      key={b.currency}
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        b.amount > 0 ? "text-red-600" : b.amount < 0 ? "text-green-600" : "",
                      )}
                    >
                      {formatInvoiceCurrency(Math.abs(b.amount), b.currency, info)}
                    </span>
                  );
                })
              ) : formattedBalance ? (
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    effectiveBalance && effectiveBalance > 0
                      ? "text-red-600"
                      : effectiveBalance && effectiveBalance < 0
                        ? "text-green-600"
                        : "",
                  )}
                >
                  {formattedBalance}
                </span>
              ) : null}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="outline" size="sm" className="h-7 text-xs px-2" asChild>
                <Link href={newOrderHref}>
                  <Plus className="h-3 w-3 mr-0.5" />
                  {tCommon("newOrder")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2" asChild>
                <Link href={newInvoiceHref}>
                  <Plus className="h-3 w-3 mr-0.5" />
                  {tCommon("newInvoice")}
                </Link>
              </Button>
              <Button size="sm" className="h-7 text-xs px-2" asChild>
                <Link
                  href={
                    partyType === "Customer"
                      ? `/payments/receive?customer=${encodeURIComponent(partyName)}`
                      : `/payments/pay?supplier=${encodeURIComponent(partyName)}`
                  }
                >
                  {partyType === "Customer"
                    ? tCustomers("receivePayment")
                    : tVendors("makePayment")}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── All transactions in one scrollable area ── */}
        <ScrollArea className="flex-1 px-4 pb-4">
          {/* Recent orders — compact */}
          {recentOrders.length > 0 && (
            <div className="mb-2 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {partyType === "Customer" ? "Orders" : "PO"} ({recentOrders.length})
              </p>
              {recentOrders.map((o) => {
                const info = currencyMap?.get(o.currency);
                const href =
                  partyType === "Customer"
                    ? `/sales-orders/${encodeURIComponent(o.name)}`
                    : `/purchase-orders/${encodeURIComponent(o.name)}`;
                return (
                  <Link
                    key={o.name}
                    href={href}
                    className="flex items-center justify-between rounded px-1.5 py-1 text-xs hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-3.5 px-1 ${o.status === "Completed" ? "text-green-600 border-green-300" : o.status === "To Deliver and Bill" || o.status === "To Bill" ? "text-amber-600 border-amber-300" : "text-blue-600 border-blue-300"}`}
                      >
                        {o.status}
                      </Badge>
                      <span className="font-mono text-muted-foreground text-[11px]">{o.name}</span>
                    </div>
                    <span className="font-medium tabular-nums text-[11px]">
                      {formatInvoiceCurrency(o.grand_total, o.currency, info)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Ledger */}
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
