"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/shared/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBankAccountDetail, useCurrencyMap } from "@/hooks/use-accounts";
import { useUnreconciledEntries, useReconcileEntries } from "@/hooks/use-bank-reconciliation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getToday } from "@/lib/utils";

export default function ReconcilePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const accountName = decodeURIComponent(params.id as string);

  const [statementDate, setStatementDate] = useState(getToday);
  const [statementBalance, setStatementBalance] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const { data: account, isLoading: accountLoading } = useBankAccountDetail(accountName);
  const { data: entries = [], isLoading: entriesLoading } = useUnreconciledEntries(
    accountName,
    statementDate,
  );
  const reconcile = useReconcileEntries();
  const { data: currencyMap } = useCurrencyMap();

  const currencyInfo = account?.account_currency
    ? currencyMap?.get(account.account_currency)
    : undefined;
  const symbol = currencyInfo?.symbol ?? account?.account_currency ?? "$";
  const onRight = currencyInfo?.onRight ?? false;

  function fmtAmount(v: number) {
    return formatCurrency(v, symbol, onRight);
  }

  const clearedBalance = useMemo(() => {
    return entries.reduce((sum, entry) => {
      if (!selected[entry.name]) return sum;
      return sum + entry.debit - entry.credit;
    }, 0);
  }, [entries, selected]);

  const parsedStatementBalance = parseFloat(statementBalance) || 0;
  const difference = parsedStatementBalance - clearedBalance;
  const isReconciled = statementBalance !== "" && Math.abs(difference) < 0.01;

  const selectedEntries = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  function handleToggle(name: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [name]: checked }));
  }

  function handleSelectAll() {
    const next: Record<string, boolean> = {};
    entries.forEach((e) => {
      next[e.name] = true;
    });
    setSelected(next);
  }

  function handleClearAll() {
    setSelected({});
  }

  async function handleReconcile() {
    if (selectedEntries.length === 0) return;
    try {
      await reconcile.mutateAsync({
        entries: selectedEntries,
        clearanceDate: statementDate,
      });
      toast.success(t("reconcileSuccess"));
      router.push(`/banks/${encodeURIComponent(accountName)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reconcile");
    }
  }

  const allSelected = entries.length > 0 && entries.every((e) => selected[e.name]);

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
            <h1 className="text-2xl font-semibold">
              {t("reconciliation")} — {account?.account_name}
            </h1>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t("statementDate")}</Label>
          <DateInput
            value={statementDate}
            onChange={(e) => {
              setStatementDate(e.target.value);
              setSelected({});
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statementBalance")}</Label>
          <Input
            type="number"
            step="any"
            placeholder="0.00"
            value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          {account?.balance !== undefined && (
            <span className="text-sm text-muted-foreground">
              {t("balance")} ({tc("asOfToday")}): {fmtAmount(account.balance)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("unreconciled")}</span>
        <div className="flex gap-2">
          {allSelected ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
              {tc("clear")}
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
              {tc("selectAll")}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border max-h-[50vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>{tc("date")}</TableHead>
              <TableHead>{tc("voucherType")}</TableHead>
              <TableHead>{tc("voucherNo")}</TableHead>
              <TableHead className="text-right">{tc("debit")}</TableHead>
              <TableHead className="text-right">{tc("credit")}</TableHead>
              <TableHead>{tc("remarks")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entriesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {tc("noTransactions")}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.name}>
                  <TableCell>
                    <Checkbox
                      checked={!!selected[entry.name]}
                      onCheckedChange={(checked) => handleToggle(entry.name, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(entry.posting_date)}
                  </TableCell>
                  <TableCell>{entry.voucher_type}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.voucher_no}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.debit > 0 ? fmtAmount(entry.debit) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.credit > 0 ? fmtAmount(entry.credit) : "\u2014"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {entry.remarks}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 rounded-md border bg-background p-4 space-y-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t("clearedBalance")}</span>
            <div className="text-lg font-semibold tabular-nums">{fmtAmount(clearedBalance)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">{t("statementBalance")}</span>
            <div className="text-lg font-semibold tabular-nums">
              {statementBalance ? fmtAmount(parsedStatementBalance) : "\u2014"}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">{t("difference")}</span>
            <div
              className={`text-lg font-semibold tabular-nums ${
                isReconciled ? "text-green-600" : statementBalance ? "text-red-600" : ""
              }`}
            >
              {statementBalance ? fmtAmount(difference) : "\u2014"}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleReconcile}
            disabled={!isReconciled || selectedEntries.length === 0 || reconcile.isPending}
          >
            {reconcile.isPending ? tc("loading") : t("markCleared")}
          </Button>
        </div>
      </div>
    </div>
  );
}
