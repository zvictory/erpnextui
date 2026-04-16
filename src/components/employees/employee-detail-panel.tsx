"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IceCreamCone,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUp,
  ArrowDown,
  Send,
  Trash2,
  Banknote,
} from "lucide-react";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getInitials, getVoucherIcon } from "@/components/shared/party-detail-panel";
import { usePartyLedger, usePartyDraftJEs } from "@/hooks/use-party-balances";
import { useSubmitJournalEntry, useDeleteJournalEntry } from "@/hooks/use-journal-entries";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency, formatInvoiceCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { EmployeeCostSetup } from "./employee-cost-setup";
import { EmployeeAdvanceDialog } from "./employee-advance-dialog";
import { IceCreamSaleDialog } from "./ice-cream-sale-dialog";
import { IceCreamSaleDetailDialog } from "./ice-cream-sale-detail-dialog";
import { JEDetailDialog } from "./je-detail-dialog";
import { SalaryPaymentDialog } from "./salary-payment-dialog";
import type { IceCreamFormValues } from "./ice-cream-sale-dialog";
import type { CurrencyBalance } from "@/types/party-report";

function parseLinkedSI(remarks: string | undefined): string | null {
  if (!remarks) return null;
  const match = remarks.match(/\[SI:([^\]]+)\]/);
  return match ? match[1] : null;
}

interface EmployeeDetailPanelProps {
  employeeName: string;
  employeeDisplayName: string;
  designation: string;
  department: string;
  outstandingBalance: number | null;
  currencyBalances: CurrencyBalance[];
  monthlySalary?: number;
  className?: string;
}

export function EmployeeDetailPanel({
  employeeName,
  employeeDisplayName,
  designation,
  department,
  outstandingBalance,
  currencyBalances = [],
  monthlySalary,
  className,
}: EmployeeDetailPanelProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const tInvoices = useTranslations("invoices");
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { data: ledgerEntries, isLoading: ledgerLoading } = usePartyLedger(
    "Employee",
    employeeName,
    company,
  );
  const { data: draftJEs } = usePartyDraftJEs("Employee", employeeName, company);

  const submitJE = useSubmitJournalEntry();
  const deleteJE = useDeleteJournalEntry();

  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [iceCreamDialogOpen, setIceCreamDialogOpen] = useState(false);
  const [salaryPayDialogOpen, setSalaryPayDialogOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type: "submit" | "delete";
    name: string;
  } | null>(null);

  // Sale detail dialog state
  const [saleDetailOpen, setSaleDetailOpen] = useState(false);
  const [saleDetailSI, setSaleDetailSI] = useState("");
  const [saleDetailJE, setSaleDetailJE] = useState("");

  // JE detail dialog state
  const [jeDetailOpen, setJEDetailOpen] = useState(false);
  const [jeDetailName, setJEDetailName] = useState("");

  // Amend pre-fill
  const [iceCreamDefaults, setIceCreamDefaults] = useState<IceCreamFormValues | undefined>();

  const handleNewAdvance = () => {
    setAdvanceDialogOpen(true);
  };

  const handleIceCreamSale = () => {
    setIceCreamDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "submit") {
      submitJE.mutate(
        { name: confirmAction.name },
        {
          onSuccess: () => {
            toast.success(t("submitSuccess"));
            setConfirmAction(null);
          },
        },
      );
    } else {
      deleteJE.mutate(
        { name: confirmAction.name },
        {
          onSuccess: () => {
            toast.success(t("deleteSuccess"));
            setConfirmAction(null);
          },
        },
      );
    }
  };

  const handleRowClick = (entry: (typeof displayEntries)[number]) => {
    const linkedSI = !entry.isDraft ? parseLinkedSI(entry.remarks) : null;
    if (linkedSI) {
      setSaleDetailSI(linkedSI);
      setSaleDetailJE(entry.voucher_no);
      setSaleDetailOpen(true);
    } else if (entry.voucher_type === "Journal Entry") {
      setJEDetailName(entry.isDraft ? entry.name : entry.voucher_no);
      setJEDetailOpen(true);
    }
  };

  const handleAmend = (values: IceCreamFormValues) => {
    setSaleDetailOpen(false);
    setIceCreamDefaults(values);
    setIceCreamDialogOpen(true);
  };

  const formattedBalance =
    outstandingBalance != null
      ? formatCurrency(Math.abs(outstandingBalance), currencySymbol, symbolOnRight)
      : null;

  const displayEntries = useMemo(() => {
    // Submitted entries from GL
    const glEntries = (ledgerEntries ?? []).map((e) => ({
      ...e,
      isDraft: false as const,
    }));

    // Draft JEs (not yet in GL) — use real account currency from child rows
    const draftEntries = (draftJEs ?? []).map((d) => ({
      name: d.name,
      posting_date: d.posting_date,
      account: "",
      debit:
        d.exchange_rate === 1
          ? d.debit_in_account_currency
          : Math.round(d.debit_in_account_currency * d.exchange_rate * 100) / 100,
      credit:
        d.exchange_rate === 1
          ? d.credit_in_account_currency
          : Math.round(d.credit_in_account_currency * d.exchange_rate * 100) / 100,
      account_currency: d.account_currency,
      debit_in_account_currency: d.debit_in_account_currency,
      credit_in_account_currency: d.credit_in_account_currency,
      voucher_type: "Journal Entry",
      voucher_no: d.name,
      remarks: d.user_remark ?? "",
      isDraft: true as const,
    }));

    const all = [...glEntries, ...draftEntries];
    if (!all.length) return [];

    const sorted = [...all].sort((a, b) => a.posting_date.localeCompare(b.posting_date));
    const runningByCurrency = new Map<string, number>();
    const withBalance = sorted.map((e) => {
      if (e.isDraft) {
        return { ...e, balance: 0, balanceCurrency: e.account_currency };
      }
      const curr = e.account_currency;
      const prev = runningByCurrency.get(curr) ?? 0;
      const newBal = prev + e.debit_in_account_currency - e.credit_in_account_currency;
      runningByCurrency.set(curr, newBal);
      return { ...e, balance: newBal, balanceCurrency: curr };
    });
    return sortAsc ? withBalance : [...withBalance].reverse();
  }, [ledgerEntries, draftJEs, sortAsc]);

  return (
    <>
      <div className={cn("h-full flex flex-col gap-0 min-h-0", className)}>
        <span className="sr-only">
          {employeeDisplayName} — {t("employee")} {t("details")}
        </span>

        <div className="flex flex-col gap-4 p-6 pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {getInitials(employeeDisplayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-base font-bold leading-tight truncate">
                {employeeDisplayName}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate">{employeeName}</span>
                {designation && (
                  <Badge variant="secondary" className="text-xs py-0 h-4">
                    {designation}
                  </Badge>
                )}
                {department && (
                  <Badge variant="outline" className="text-xs py-0 h-4">
                    {department}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              {outstandingBalance == null ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("outstanding")}</p>
                    {currencyBalances.length >= 1 ? (
                      <>
                        <div className="flex flex-col gap-0.5">
                          {currencyBalances.map((b) => {
                            const info = currencyMap?.get(b.currency);
                            return (
                              <p
                                key={b.currency}
                                className={cn(
                                  "font-bold tabular-nums",
                                  currencyBalances.length > 1 ? "text-lg" : "text-2xl",
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
                        {currencyBalances.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-1.5 border-t pt-1.5">
                            {tInvoices("total")} ≈ {formattedBalance}
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className={
                          outstandingBalance > 0
                            ? "text-2xl font-bold text-red-600 tabular-nums"
                            : outstandingBalance < 0
                              ? "text-2xl font-bold text-green-600 tabular-nums"
                              : "text-2xl font-bold tabular-nums"
                        }
                      >
                        {formattedBalance}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("employee")} · {tCommon("asOfToday")}
                    </p>
                  </div>
                  <div
                    className={
                      outstandingBalance > 0
                        ? "text-red-600"
                        : outstandingBalance < 0
                          ? "text-green-600"
                          : "text-muted-foreground"
                    }
                  >
                    {outstandingBalance > 0 ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : outstandingBalance < 0 ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {monthlySalary != null && monthlySalary > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("monthlySalary")}:{" "}
              <span className="font-medium tabular-nums">
                {formatCurrency(monthlySalary, currencySymbol, symbolOnRight)}
              </span>
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleIceCreamSale}>
              <IceCreamCone className="h-4 w-4 mr-1" />
              {t("iceCreamSale")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSalaryPayDialogOpen(true)}>
              <Banknote className="h-4 w-4 mr-1" />
              {t("paySalary")}
            </Button>
            <Button size="sm" onClick={handleNewAdvance}>
              <Plus className="h-4 w-4 mr-1" />
              {t("newAdvance")}
            </Button>
          </div>

          <EmployeeCostSetup employeeId={employeeName} />
        </div>

        <Separator />

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
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                displayEntries.map((entry) => (
                  <TableRow
                    key={entry.name}
                    className={cn(
                      "cursor-pointer hover:bg-accent/50",
                      entry.isDraft && "opacity-70",
                    )}
                    onClick={() => handleRowClick(entry)}
                  >
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
                        {entry.isDraft && (
                          <Badge variant="secondary" className="text-xs">
                            {tCommon("draft")}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs mt-0.5 text-muted-foreground flex items-center gap-1.5">
                        <span>{entry.isDraft ? entry.remarks : entry.voucher_no}</span>
                        {!entry.isDraft && parseLinkedSI(entry.remarks) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {parseLinkedSI(entry.remarks)}
                          </Badge>
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
                        entry.isDraft
                          ? "text-muted-foreground"
                          : entry.balance > 0
                            ? "text-red-600"
                            : entry.balance < 0
                              ? "text-green-600"
                              : "text-muted-foreground",
                      )}
                    >
                      {entry.isDraft
                        ? "—"
                        : formatInvoiceCurrency(
                            Math.abs(entry.balance),
                            entry.balanceCurrency,
                            currencyMap?.get(entry.balanceCurrency),
                          )}
                    </TableCell>
                    <TableCell>
                      {entry.isDraft && (
                        <div
                          className="flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setConfirmAction({ type: "submit", name: entry.name })}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => setConfirmAction({ type: "delete", name: entry.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <EmployeeAdvanceDialog
        open={advanceDialogOpen}
        onOpenChange={setAdvanceDialogOpen}
        employee={employeeName}
        company={company}
      />

      <IceCreamSaleDialog
        open={iceCreamDialogOpen}
        onOpenChange={(open) => {
          setIceCreamDialogOpen(open);
          if (!open) setIceCreamDefaults(undefined);
        }}
        employee={employeeName}
        employeeName={employeeDisplayName}
        company={company}
        defaultValues={iceCreamDefaults}
      />

      <IceCreamSaleDetailDialog
        open={saleDetailOpen}
        onOpenChange={setSaleDetailOpen}
        siName={saleDetailSI}
        jeName={saleDetailJE}
        employee={employeeName}
        employeeName={employeeDisplayName}
        company={company}
        onAmend={handleAmend}
      />

      <JEDetailDialog open={jeDetailOpen} onOpenChange={setJEDetailOpen} jeName={jeDetailName} />

      <SalaryPaymentDialog
        open={salaryPayDialogOpen}
        onOpenChange={setSalaryPayDialogOpen}
        employee={employeeName}
        employeeName={employeeDisplayName}
        company={company}
        defaultAmount={monthlySalary}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.type === "submit" ? tCommon("submit") : tCommon("delete")}
        description={
          confirmAction?.type === "submit" ? t("confirmSubmitDraft") : t("confirmDeleteDraft")
        }
        confirmLabel={confirmAction?.type === "submit" ? tCommon("submit") : tCommon("delete")}
        variant={confirmAction?.type === "submit" ? "default" : "destructive"}
        onConfirm={handleConfirmAction}
        loading={submitJE.isPending || deleteJE.isPending}
      />
    </>
  );
}
