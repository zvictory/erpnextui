"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { LinkField } from "@/components/shared/link-field";
import { DateInput } from "@/components/shared/date-input";
import { useBankAccountsWithCurrency, useCurrencyMap } from "@/hooks/use-accounts";
import { useOutstandingInvoices, useCreatePaymentEntry, usePaymentEntry } from "@/hooks/use-payment-entries";
import { usePartyLedger } from "@/hooks/use-party-balances";
import { useCustomer } from "@/hooks/use-customers";
import { useCompanyStore } from "@/stores/company-store";
import { cn, getToday } from "@/lib/utils";
import { formatNumber, formatDate, formatInvoiceCurrency } from "@/lib/formatters";
import type { PaymentReference } from "@/types/payment-entry";

const selectClassName = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export default function ReceivePaymentPage() {
  const t = useTranslations("payments");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { company, currencyCode: companyCurrency } = useCompanyStore();

  const { data: bankAccounts = [] } = useBankAccountsWithCurrency(company);
  const createPayment = useCreatePaymentEntry();

  const prefilledCustomer = searchParams.get("customer") ?? "";
  const amendFrom = searchParams.get("amend_from") ?? "";
  const { data: amendDoc } = usePaymentEntry(amendFrom);

  const [customer, setCustomer] = useState(prefilledCustomer);
  const [postingDate, setPostingDate] = useState(getToday);
  const [paymentAccount, setPaymentAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [amendApplied, setAmendApplied] = useState(false);

  // Pre-fill from amend source once loaded
  useEffect(() => {
    if (amendDoc && !amendApplied) {
      setCustomer(amendDoc.party);
      setAmount(String(amendDoc.paid_amount));
      setPaymentAccount(amendDoc.paid_to);
      setRemarks(amendDoc.remarks ?? "");
      setAmendApplied(true);
    }
  }, [amendDoc, amendApplied]);
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const { data: customerDoc } = useCustomer(customer);
  const partyCurrency = customerDoc?.default_currency ?? "";
  const filteredBankAccounts = useMemo(
    () =>
      partyCurrency
        ? bankAccounts.filter((a) => a.account_currency === partyCurrency)
        : bankAccounts,
    [bankAccounts, partyCurrency],
  );

  const { data: invoices = [], isLoading: loadingInvoices } = useOutstandingInvoices(
    "Customer",
    customer,
    company,
  );
  const { data: ledgerEntries } = usePartyLedger("Customer", customer, company);
  const { data: currencyMap } = useCurrencyMap();

  // Compute outstanding balance per currency from GL entries
  const balances = useMemo(() => {
    if (!ledgerEntries?.length) return [];
    const byCurrency = new Map<string, number>();
    for (const e of ledgerEntries) {
      const prev = byCurrency.get(e.account_currency) ?? 0;
      byCurrency.set(
        e.account_currency,
        prev + e.debit_in_account_currency - e.credit_in_account_currency,
      );
    }
    return Array.from(byCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .filter((b) => Math.abs(b.amount) > 0.005);
  }, [ledgerEntries]);

  const parsedAmount = parseFloat(amount) || 0;

  const totalAllocated = invoices.reduce((sum, inv) => {
    if (!selections[inv.name]) return sum;
    return sum + (parseFloat(allocations[inv.name]) || 0);
  }, 0);

  const isOverAllocated = totalAllocated > parsedAmount + 0.005;
  const isBalanced = Math.abs(totalAllocated - parsedAmount) < 0.005;

  // Clear selections and reset account when customer changes
  useEffect(() => {
    setSelections({});
    setAllocations({});
    setPaymentAccount("");
  }, [customer]);

  /** Distribute `total` across selected invoices FIFO (due_date asc). */
  const computeAllocations = (selected: Record<string, boolean>, total: number) => {
    const alloc: Record<string, string> = {};
    let remaining = total;
    for (const inv of invoices) {
      if (!selected[inv.name]) continue;
      const amt = Math.min(inv.outstanding_amount, remaining);
      alloc[inv.name] = String(amt);
      remaining = Math.max(0, remaining - amt);
    }
    return alloc;
  };

  const handleSelectAll = () => {
    // Compute allocations assuming all invoices are selected
    const allSelected: Record<string, boolean> = {};
    invoices.forEach((inv) => {
      allSelected[inv.name] = true;
    });

    const totalOutstanding = invoices.reduce((s, inv) => s + inv.outstanding_amount, 0);
    if (!parsedAmount) {
      setAmount(totalOutstanding > 0 ? String(totalOutstanding) : "");
    }
    const pool = parsedAmount || totalOutstanding;
    const alloc = computeAllocations(allSelected, pool);

    // Only check invoices that received a non-zero allocation
    const next: Record<string, boolean> = {};
    for (const inv of invoices) {
      if ((parseFloat(alloc[inv.name]) || 0) > 0) {
        next[inv.name] = true;
      }
    }
    setSelections(next);
    setAllocations(alloc);
  };

  const handleClearAll = () => {
    setSelections({});
    setAllocations({});
    setAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !paymentAccount || parsedAmount <= 0) return;
    if (isOverAllocated) return;

    const checkedInvoices = invoices.filter(
      (inv) => selections[inv.name] && (parseFloat(allocations[inv.name]) || 0) > 0,
    );

    const refs: PaymentReference[] = checkedInvoices.map((inv) => ({
      reference_doctype: "Sales Invoice",
      reference_name: inv.name,
      total_amount: inv.grand_total,
      outstanding_amount: inv.outstanding_amount,
      allocated_amount: parseFloat(allocations[inv.name]) || 0,
    }));

    try {
      const selectedAccount = filteredBankAccounts.find((a) => a.name === paymentAccount);
      await createPayment.mutateAsync({
        partyType: "Customer",
        party: customer,
        company,
        companyCurrency,
        postingDate,
        paymentAccount,
        paymentAccountCurrency: selectedAccount?.account_currency ?? companyCurrency,
        amount: parsedAmount,
        referenceNo: "",
        referenceDate: "",
        remarks,
        allocations: refs,
        partyCurrency: partyCurrency || undefined,
        amendedFrom: amendFrom || undefined,
      });
      toast.success(t("submitted"));
      router.push(prefilledCustomer ? "/customers" : "/payments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create payment entry.");
    }
  };

  const allSelected = invoices.length > 0 && invoices.every((inv) => selections[inv.name]);

  return (
    <FormPageLayout
      title={t("receivePayment")}
      backHref={prefilledCustomer ? "/customers" : "/payments"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>
                {t("party")} <span className="text-destructive">*</span>
              </Label>
              {customer && balances.length > 0 && (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {balances
                    .map((b) => {
                      const info = currencyMap?.get(b.currency);
                      return formatInvoiceCurrency(Math.abs(b.amount), b.currency, info);
                    })
                    .join(" / ")}
                </span>
              )}
            </div>
            <LinkField
              doctype="Customer"
              value={customer}
              onChange={setCustomer}
              placeholder={t("party")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                {t("depositTo")} <span className="text-destructive">*</span>
              </Label>
              {partyCurrency && (
                <span className="text-xs text-muted-foreground">{partyCurrency}</span>
              )}
            </div>
            <select
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              className={cn(selectClassName, !paymentAccount && "text-muted-foreground")}
            >
              <option value="">{t("selectAccount")}</option>
              {filteredBankAccounts.map((acc) => (
                <option key={acc.name} value={acc.name}>
                  {acc.name} ({acc.account_currency})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("date")}</Label>
            <DateInput value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>
              {t("paymentAmount")} <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("remarks")}</Label>
            <Textarea
              placeholder={t("optionalNotes")}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Outstanding Invoices */}
        {customer && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("outstandingInvoices")}</span>
              <div className="flex gap-2">
                {allSelected ? (
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
                    {t("clear")}
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
                    {t("selectAll")}
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t("invoice")}</TableHead>
                    <TableHead>{t("dueDate")}</TableHead>
                    <TableHead>{t("currency")}</TableHead>
                    <TableHead className="text-right">{t("original")}</TableHead>
                    <TableHead className="text-right">{t("outstanding")}</TableHead>
                    <TableHead className="text-right w-32">{t("allocate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInvoices ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-16 text-center text-muted-foreground text-sm"
                      >
                        {t("loadingInvoices")}
                      </TableCell>
                    </TableRow>
                  ) : !invoices.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-16 text-center text-muted-foreground text-sm"
                      >
                        {t("noOutstanding")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow key={inv.name}>
                        <TableCell>
                          <Checkbox
                            checked={!!selections[inv.name]}
                            onCheckedChange={(checked) => {
                              const next = { ...selections, [inv.name]: !!checked };
                              setSelections(next);
                              const selectedOutstanding = invoices
                                .filter((i) => next[i.name])
                                .reduce((sum, i) => sum + i.outstanding_amount, 0);
                              if (!parsedAmount) {
                                setAmount(
                                  selectedOutstanding > 0 ? String(selectedOutstanding) : "",
                                );
                              }
                              const pool = parsedAmount || selectedOutstanding;
                              setAllocations(computeAllocations(next, pool));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{inv.name}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(inv.due_date)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.currency ?? ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatNumber(inv.grand_total)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatNumber(inv.outstanding_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            className="h-7 w-28 text-right tabular-nums text-sm ml-auto"
                            value={allocations[inv.name] ?? ""}
                            disabled={!selections[inv.name]}
                            onChange={(e) =>
                              setAllocations((prev) => ({
                                ...prev,
                                [inv.name]: e.target.value,
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div
              className={cn(
                "flex items-center justify-end gap-4 rounded-md px-4 py-2 text-sm",
                isOverAllocated
                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  : "bg-muted/40",
              )}
            >
              <span>
                {t("totalAllocated")}:{" "}
                <span className="font-semibold tabular-nums">{formatNumber(totalAllocated)}</span>
              </span>
              <span>
                {t("paymentAmount")}:{" "}
                <span className="font-semibold tabular-nums">{formatNumber(parsedAmount)}</span>
              </span>
              {isBalanced && parsedAmount > 0 && (
                <CheckCircle2 className="size-4 text-green-600 shrink-0" />
              )}
              {parsedAmount > 0 &&
                !isOverAllocated &&
                !isBalanced &&
                totalAllocated < parsedAmount && (
                  <span className="text-muted-foreground">
                    {t("remaining")} {formatNumber(parsedAmount - totalAllocated)}{" "}
                    {t("recordedAsAdvance")}
                  </span>
                )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(prefilledCustomer ? "/customers" : "/payments")}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={
              createPayment.isPending ||
              !customer ||
              !paymentAccount ||
              parsedAmount <= 0 ||
              isOverAllocated
            }
          >
            {createPayment.isPending ? t("submitting") : t("receivePayment")}
          </Button>
        </div>
      </form>
    </FormPageLayout>
  );
}
