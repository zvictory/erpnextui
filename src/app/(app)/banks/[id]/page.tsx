"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, RefreshCw, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBankAccountDetail,
  useGLEntries,
  useGLEntryCount,
  useCurrencyMap,
} from "@/hooks/use-accounts";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { GLEntry } from "@/types/account";

const GL_PAGE_SIZE = 50;

export default function BankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const accountName = decodeURIComponent(params.id as string);

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("posting_date desc");

  const { data: account, isLoading: accountLoading, refetch } = useBankAccountDetail(accountName);
  const { data: entries = [], isLoading: entriesLoading } = useGLEntries(accountName, page, sort);
  const { data: totalCount = 0 } = useGLEntryCount(accountName);
  const { data: currencyMap } = useCurrencyMap();

  const currencyInfo = account?.account_currency
    ? currencyMap?.get(account.account_currency)
    : undefined;
  const symbol = currencyInfo?.symbol ?? account?.account_currency ?? "$";
  const onRight = currencyInfo?.onRight ?? false;

  const showRunningBalance = sort === "posting_date asc" && page === 1;

  const entriesWithBalance = useMemo(() => {
    if (!showRunningBalance) return entries as GLEntry[];
    let running = 0;
    return (entries as GLEntry[]).map((e) => {
      running += e.debit_in_account_currency - e.credit_in_account_currency;
      return { ...e, runningBalance: running };
    });
  }, [entries, showRunningBalance]);

  const hasNext = page * GL_PAGE_SIZE < totalCount;
  const hasPrev = page > 1;
  const start = (page - 1) * GL_PAGE_SIZE + 1;
  const end = Math.min(page * GL_PAGE_SIZE, totalCount);

  function fmtAmount(v: number) {
    return formatCurrency(v, symbol, onRight);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          {accountLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-2xl font-semibold">{account?.account_name}</h1>
          )}
        </div>

        {account?.balance !== undefined && (
          <Badge variant="outline" className="text-sm font-medium">
            {fmtAmount(account.balance)}
          </Badge>
        )}

        <Button variant="outline" size="sm" asChild>
          <Link href={`/banks/${encodeURIComponent(accountName)}/reconcile`}>
            <Scale className="h-4 w-4 mr-1.5" />
            {t("reconcile")}
          </Link>
        </Button>

        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{tc("sort")}:</span>
        <Button
          variant={sort === "posting_date asc" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSort("posting_date asc");
            setPage(1);
          }}
        >
          {tc("oldestFirst")}
        </Button>
        <Button
          variant={sort === "posting_date desc" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSort("posting_date desc");
            setPage(1);
          }}
        >
          {tc("newestFirst")}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("date")}</TableHead>
              <TableHead>{tc("voucherType")}</TableHead>
              <TableHead>{tc("voucherNo")}</TableHead>
              <TableHead className="text-right">{tc("debit")}</TableHead>
              <TableHead className="text-right">{tc("credit")}</TableHead>
              <TableHead className="text-right">
                {tc("runningBalance")}
                {!showRunningBalance && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({tc("ascOnly")})
                  </span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entriesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entriesWithBalance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {tc("noTransactions")}
                </TableCell>
              </TableRow>
            ) : (
              entriesWithBalance.map((entry) => (
                <TableRow key={entry.name}>
                  <TableCell>{formatDate(entry.posting_date)}</TableCell>
                  <TableCell>{entry.voucher_type}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.voucher_no}</TableCell>
                  <TableCell className="text-right">
                    {entry.debit_in_account_currency > 0
                      ? fmtAmount(entry.debit_in_account_currency)
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.credit_in_account_currency > 0
                      ? fmtAmount(entry.credit_in_account_currency)
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {showRunningBalance ? fmtAmount(entry.runningBalance ?? 0) : "\u2014"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount > 0
            ? `${tc("showing")} ${start}\u2013${end} ${tc("of")} ${totalCount}`
            : tc("noTransactions")}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrev}
          >
            {tc("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
          >
            {tc("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
