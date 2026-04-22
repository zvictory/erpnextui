"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Landmark,
  CreditCard,
  Scale,
  TrendingDown,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportToExcel } from "@/lib/utils/export-excel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/shared/date-input";
import {
  useAccountWithBalance,
  useLedgerEntries,
  useLedgerEntryCount,
  useCurrentExchangeRate,
  useCurrencyMap,
  type CurrencyInfo,
} from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import {
  formatNumber,
  formatDate,
  formatExchangeRate,
  getExchangeRateDisplay,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { LedgerEntry } from "@/types/account";

const PAGE_SIZE = 50;

const ROOT_TYPE_CONFIG: Record<string, { icon: typeof Building2; color: string; bg: string }> = {
  Asset: {
    icon: Building2,
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-900/50",
  },
  Liability: {
    icon: TrendingDown,
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-900/50",
  },
  Equity: {
    icon: Scale,
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-100 dark:bg-indigo-900/50",
  },
  Income: {
    icon: Landmark,
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-100 dark:bg-green-900/50",
  },
  Expense: {
    icon: CreditCard,
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-100 dark:bg-rose-900/50",
  },
};

function getSymbol(code: string, map?: Map<string, CurrencyInfo>) {
  return map?.get(code)?.symbol || code;
}

function extractTime(creation?: string) {
  if (!creation) return "";
  // creation comes as "YYYY-MM-DD HH:MM:SS.ffffff" — extract HH:MM
  const timePart = creation.split(" ")[1];
  return timePart ? timePart.slice(0, 5) : "";
}

function deriveExchangeRate(entry: LedgerEntry): number | null {
  if (entry.debit_in_account_currency > 0 && entry.debit > 0) {
    return entry.debit / entry.debit_in_account_currency;
  }
  if (entry.credit_in_account_currency > 0 && entry.credit > 0) {
    return entry.credit / entry.credit_in_account_currency;
  }
  return null;
}

const VOUCHER_ROUTES: Record<string, string> = {
  "Payment Entry": "/payments",
  "Sales Invoice": "/sales-invoices",
  "Purchase Invoice": "/purchase-invoices",
};

function voucherHref(voucherType: string, voucherNo: string): string | null {
  const base = VOUCHER_ROUTES[voucherType];
  if (!base) return null;
  return `${base}/${encodeURIComponent(voucherNo)}`;
}

export default function AccountLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const accountName = decodeURIComponent(params.account as string);
  const { currencyCode: companyCurrency } = useCompanyStore();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("posting_date desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // Applied filters (only update on Apply click)
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const { data: account, isLoading: accountLoading } = useAccountWithBalance(
    accountName,
    companyCurrency,
  );
  const { data: entries = [], isLoading: entriesLoading } = useLedgerEntries(
    accountName,
    page,
    sort,
    appliedFrom || undefined,
    appliedTo || undefined,
  );
  const { data: totalCount = 0 } = useLedgerEntryCount(
    accountName,
    appliedFrom || undefined,
    appliedTo || undefined,
  );
  const { data: currencyMap } = useCurrencyMap();

  const isForeign = !!account && account.account_currency !== companyCurrency;

  const { data: currentRate } = useCurrentExchangeRate(
    account?.account_currency ?? "",
    companyCurrency,
  );

  // Compute running balance + exchange rate per row
  const enrichedEntries = useMemo(() => {
    const raw = entries as LedgerEntry[];
    if (raw.length === 0) return raw;

    // Running balance only on page 1
    if (page !== 1) {
      return raw.map((e) => ({ ...e, exchangeRate: deriveExchangeRate(e) ?? undefined }));
    }

    if (sort.includes("desc")) {
      // DESC: start from current balance, subtract going down
      let runAcc = account?.balance ?? 0;
      let runBase = account?.baseBalance ?? 0;
      return raw.map((e) => {
        const result = {
          ...e,
          runningBalance: runAcc,
          runningBalanceBase: runBase,
          exchangeRate: deriveExchangeRate(e) ?? undefined,
        };
        runAcc -= e.debit_in_account_currency - e.credit_in_account_currency;
        runBase -= e.debit - e.credit;
        return result;
      });
    } else {
      // ASC: accumulate from 0
      let runAcc = 0;
      let runBase = 0;
      return raw.map((e) => {
        runAcc += e.debit_in_account_currency - e.credit_in_account_currency;
        runBase += e.debit - e.credit;
        return {
          ...e,
          runningBalance: runAcc,
          runningBalanceBase: runBase,
          exchangeRate: deriveExchangeRate(e) ?? undefined,
        };
      });
    }
  }, [entries, page, sort, account?.balance, account?.baseBalance]);

  const hasNext = page * PAGE_SIZE < totalCount;
  const hasPrev = page > 1;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalCount);
  const showRunning = page === 1;

  const baseSymbol = getSymbol(companyCurrency, currencyMap);

  const rateDisplayDir = useMemo(() => {
    if (!isForeign || !account) return null;
    return getExchangeRateDisplay(1, account.account_currency, companyCurrency);
  }, [isForeign, account, companyCurrency]);

  function handleApply() {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setPage(1);
  }

  function handleExport() {
    if (!enrichedEntries.length) return;
    const columns = [
      { header: "Date", key: "posting_date", width: 12 },
      { header: "Voucher Type", key: "voucher_type", width: 18 },
      { header: "Voucher No", key: "voucher_no", width: 22 },
      { header: "Remarks", key: "remarks", width: 35 },
      {
        header: `Debit (${account?.account_currency || ""})`,
        key: "debit_in_account_currency",
        width: 18,
      },
      {
        header: `Credit (${account?.account_currency || ""})`,
        key: "credit_in_account_currency",
        width: 18,
      },
      ...(isForeign
        ? [
            { header: `Debit (${companyCurrency})`, key: "debit", width: 18 },
            { header: `Credit (${companyCurrency})`, key: "credit", width: 18 },
          ]
        : []),
      { header: "Balance", key: "runningBalance", width: 18 },
    ];
    const data = enrichedEntries.map((e) => ({ ...e }) as Record<string, unknown>);
    const name = (account?.account_name || accountName).replace(/[^a-zA-Z0-9]/g, "_");
    exportToExcel(data, columns, `Ledger_${name}_${appliedFrom || "all"}`);
  }

  const rootCfg = ROOT_TYPE_CONFIG[account?.root_type ?? ""] ?? ROOT_TYPE_CONFIG.Asset;
  const RootIcon = rootCfg.icon;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {accountLoading ? (
            <>
              <Skeleton className="h-7 w-64 mb-1" />
              <Skeleton className="h-4 w-48" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold truncate">{account?.account_name}</h1>
              <p className="text-sm text-muted-foreground truncate">{account?.name}</p>
            </>
          )}
        </div>
      </div>

      {/* Info cards */}
      {account && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Root Type */}
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Root Type</p>
            <Badge variant="secondary" className={cn("gap-1", rootCfg.color, rootCfg.bg)}>
              <RootIcon className="h-3 w-3" />
              {account.root_type}
            </Badge>
          </div>
          {/* Account Type */}
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Account Type</p>
            <p className="text-sm font-medium">{account.account_type || "—"}</p>
          </div>
          {/* Currency */}
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Currency</p>
            <p className="text-sm font-medium">{account.account_currency}</p>
          </div>
          {/* Current Balance */}
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                (account.balance ?? 0) < 0 ? "text-red-600 dark:text-red-400" : "text-foreground",
              )}
            >
              {formatNumber(account.balance ?? 0, 2)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {account.account_currency}
              </span>
            </p>
          </div>
          {/* Exchange Rate (foreign only) */}
          {isForeign &&
            (() => {
              const rd = getExchangeRateDisplay(
                currentRate ?? 0,
                account.account_currency,
                companyCurrency,
              );
              return (
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">Current Rate</p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <ArrowUpDown className="inline h-3 w-3 mr-1" />1 {rd.baseCcy} ={" "}
                    {formatExchangeRate(rd.displayRate)} {getSymbol(rd.quoteCcy, currencyMap)}
                  </p>
                </div>
              );
            })()}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From Date</label>
          <DateInput
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="Start date"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To Date</label>
          <DateInput
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="End date"
          />
        </div>
        <Button onClick={handleApply} size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Apply
        </Button>
        <Button
          onClick={handleExport}
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!enrichedEntries.length}
        >
          <Download className="h-3.5 w-3.5" />
          Excel
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wider">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => {
                      setSort(
                        sort === "posting_date desc" ? "posting_date asc" : "posting_date desc",
                      );
                      setPage(1);
                    }}
                  >
                    Date
                    {sort === "posting_date asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Remarks</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Voucher Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Voucher No</TableHead>
                {isForeign && rateDisplayDir && (
                  <TableHead className="text-xs uppercase tracking-wider text-right">
                    1&nbsp;{rateDisplayDir.baseCcy}&nbsp;=&nbsp;?&nbsp;{rateDisplayDir.quoteCcy}
                  </TableHead>
                )}
                <TableHead className="text-xs uppercase tracking-wider text-right">
                  Debit{isForeign ? ` (${account?.account_currency})` : ""}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">
                  Credit{isForeign ? ` (${account?.account_currency})` : ""}
                </TableHead>
                {isForeign && (
                  <>
                    <TableHead className="text-xs uppercase tracking-wider text-right">
                      Debit ({companyCurrency})
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">
                      Credit ({companyCurrency})
                    </TableHead>
                  </>
                )}
                <TableHead className="text-xs uppercase tracking-wider text-right">
                  Balance{isForeign ? ` (${account?.account_currency})` : ""}
                </TableHead>
                {isForeign && (
                  <TableHead className="text-xs uppercase tracking-wider text-right">
                    Balance ({companyCurrency})
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entriesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isForeign ? 11 : 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : enrichedEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isForeign ? 11 : 6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                enrichedEntries.map((entry, _idx) => (
                  <TableRow key={entry.name} className="transition-colors">
                    {/* Date + Time */}
                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm">{formatDate(entry.posting_date)}</span>
                      {entry.creation && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {extractTime(entry.creation)}
                        </span>
                      )}
                    </TableCell>

                    {/* Remarks */}
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                      <span className="line-clamp-2">{entry.remarks || "—"}</span>
                    </TableCell>

                    {/* Voucher Type */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                        {entry.voucher_type}
                      </Badge>
                    </TableCell>

                    {/* Voucher No */}
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {(() => {
                        const href = voucherHref(entry.voucher_type, entry.voucher_no);
                        return href ? (
                          <Link href={href} className="text-primary hover:underline">
                            {entry.voucher_no}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{entry.voucher_no}</span>
                        );
                      })()}
                    </TableCell>

                    {/* Exchange Rate (foreign only) */}
                    {isForeign && (
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground whitespace-nowrap">
                        {entry.exchangeRate && rateDisplayDir
                          ? formatExchangeRate(
                              rateDisplayDir.baseCcy === account?.account_currency
                                ? entry.exchangeRate
                                : 1 / entry.exchangeRate,
                            )
                          : "—"}
                      </TableCell>
                    )}

                    {/* Debit (account currency) */}
                    <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                      {entry.debit_in_account_currency > 0
                        ? formatNumber(entry.debit_in_account_currency, 2)
                        : "—"}
                    </TableCell>

                    {/* Credit (account currency) */}
                    <TableCell
                      className={cn(
                        "text-right tabular-nums text-sm whitespace-nowrap",
                        entry.credit_in_account_currency > 0 && "text-red-600 dark:text-red-400",
                      )}
                    >
                      {entry.credit_in_account_currency > 0
                        ? formatNumber(entry.credit_in_account_currency, 2)
                        : "—"}
                    </TableCell>

                    {/* Base currency debit/credit (foreign only) */}
                    {isForeign && (
                      <>
                        <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                          {entry.debit > 0 ? formatNumber(entry.debit, 2) : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-sm whitespace-nowrap",
                            entry.credit > 0 && "text-red-600 dark:text-red-400",
                          )}
                        >
                          {entry.credit > 0 ? formatNumber(entry.credit, 2) : "—"}
                        </TableCell>
                      </>
                    )}

                    {/* Running Balance (account currency) */}
                    <TableCell
                      className={cn(
                        "text-right tabular-nums text-sm font-medium whitespace-nowrap",
                        showRunning &&
                          (entry.runningBalance ?? 0) < 0 &&
                          "text-red-600 dark:text-red-400",
                      )}
                    >
                      {showRunning ? formatNumber(entry.runningBalance ?? 0, 2) : "—"}
                    </TableCell>

                    {/* Running Balance (base currency, foreign only) */}
                    {isForeign && (
                      <TableCell
                        className={cn(
                          "text-right tabular-nums text-sm whitespace-nowrap",
                          showRunning &&
                            (entry.runningBalanceBase ?? 0) < 0 &&
                            "text-red-600 dark:text-red-400",
                        )}
                      >
                        {showRunning
                          ? `${formatNumber(entry.runningBalanceBase ?? 0, 2)} ${baseSymbol}`
                          : "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount > 0
            ? `Showing ${start}–${end} of ${formatNumber(totalCount)}`
            : "No transactions"}
          {!showRunning && totalCount > 0 && (
            <span className="ml-2 text-xs">(running balance shown on page 1 only)</span>
          )}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrev}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
