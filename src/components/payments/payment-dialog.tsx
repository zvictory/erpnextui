"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/shared/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBar } from "@/components/shared/status-bar";
import { InsufficientBalanceWarning } from "@/components/shared/insufficient-balance-warning";
import { useBankAccountsWithCurrency } from "@/hooks/use-accounts";
import { useOutstandingInvoices, useCreatePaymentEntry } from "@/hooks/use-payment-entries";
import { useCustomer } from "@/hooks/use-customers";
import { useSupplier } from "@/hooks/use-suppliers";
import { useCompanyStore } from "@/stores/company-store";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { getToday } from "@/lib/utils";
import type { PaymentReference } from "@/types/payment-entry";

const selectClassName = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyType: "Customer" | "Supplier";
  partyName: string;
}

export function PaymentDialog({ open, onOpenChange, partyType, partyName }: PaymentDialogProps) {
  const t = useTranslations("payments");
  const { company, currencyCode: companyCurrency } = useCompanyStore();

  const { data: bankAccounts = [] } = useBankAccountsWithCurrency(company);
  const { data: customerDoc } = useCustomer(partyType === "Customer" ? partyName : "");
  const { data: supplierDoc } = useSupplier(partyType === "Supplier" ? partyName : "");
  const partyCurrency =
    (partyType === "Customer" ? customerDoc?.default_currency : supplierDoc?.default_currency) ?? "";
  const filteredBankAccounts = useMemo(
    () =>
      partyCurrency
        ? bankAccounts.filter((a) => a.account_currency === partyCurrency)
        : bankAccounts,
    [bankAccounts, partyCurrency],
  );

  const { data: invoices = [], isLoading: loadingInvoices } = useOutstandingInvoices(
    partyType,
    partyName,
    company,
  );
  const createPayment = useCreatePaymentEntry();

  const [postingDate, setPostingDate] = useState(getToday);
  const [paymentAccount, setPaymentAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });

  const parsedAmount = parseFloat(amount) || 0;

  const selectedAccount = filteredBankAccounts.find((a) => a.name === paymentAccount);
  const selectedBalance = selectedAccount?.balance ?? 0;
  const selectedCurrency = selectedAccount?.account_currency ?? "";
  const isInsufficientBalance =
    partyType === "Supplier" &&
    !!paymentAccount &&
    parsedAmount > 0 &&
    parsedAmount > selectedBalance;

  const totalAllocated = invoices.reduce((sum, inv) => {
    if (!selections[inv.name]) return sum;
    return sum + (parseFloat(allocations[inv.name]) || 0);
  }, 0);

  const isOverAllocated = totalAllocated > parsedAmount + 0.005;
  const isBalanced = Math.abs(totalAllocated - parsedAmount) < 0.005;

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

  const handleToggleInvoice = (name: string, checked: boolean) => {
    const next = { ...selections, [name]: checked };
    setSelections(next);
    const selectedOutstanding = invoices
      .filter((inv) => next[inv.name])
      .reduce((sum, inv) => sum + inv.outstanding_amount, 0);
    if (!parsedAmount) {
      setAmount(selectedOutstanding > 0 ? String(selectedOutstanding) : "");
    }
    const pool = parsedAmount || selectedOutstanding;
    setAllocations(computeAllocations(next, pool));
  };

  const resetForm = () => {
    setPostingDate(getToday());
    setPaymentAccount("");
    setAmount("");
    setMemo("");
    setSelections({});
    setAllocations({});
    setStatus({ type: null, message: "" });
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentAccount) {
      setStatus({ type: "error", message: "Please select a payment account." });
      return;
    }
    if (parsedAmount <= 0) {
      setStatus({ type: "error", message: "Amount must be greater than 0." });
      return;
    }
    if (isOverAllocated) {
      setStatus({ type: "error", message: "Total allocated exceeds payment amount." });
      return;
    }

    const checkedInvoices = invoices.filter(
      (inv) => selections[inv.name] && (parseFloat(allocations[inv.name]) || 0) > 0,
    );

    const refs: PaymentReference[] = checkedInvoices.map((inv) => ({
      reference_doctype: partyType === "Customer" ? "Sales Invoice" : "Purchase Invoice",
      reference_name: inv.name,
      total_amount: inv.grand_total,
      outstanding_amount: inv.outstanding_amount,
      allocated_amount: parseFloat(allocations[inv.name]) || 0,
    }));

    setStatus({ type: "loading", message: "Creating payment entry..." });

    try {
      const selectedAccount = filteredBankAccounts.find((a) => a.name === paymentAccount);
      await createPayment.mutateAsync({
        partyType,
        party: partyName,
        company,
        companyCurrency,
        postingDate,
        paymentAccount,
        paymentAccountCurrency: selectedAccount?.account_currency ?? companyCurrency,
        amount: parsedAmount,
        referenceNo: "",
        referenceDate: "",
        remarks: memo,
        allocations: refs,
        partyCurrency: partyCurrency || undefined,
      });
      setStatus({ type: "success", message: "Payment entry created and submitted." });
      setTimeout(() => {
        handleOpenChange(false);
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create payment entry.";
      setStatus({ type: "error", message });
    }
  };

  const allSelected = invoices.length > 0 && invoices.every((inv) => selections[inv.name]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {partyType === "Customer" ? t("receivePayment") : t("makePayment")} — {partyName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden flex-1">
          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="postingDate">{t("date")}</Label>
              <DateInput
                id="postingDate"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="paymentAccount">
                  {partyType === "Customer" ? t("depositTo") : t("payFrom")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {partyCurrency && (
                  <span className="text-xs text-muted-foreground">{partyCurrency}</span>
                )}
              </div>
              <select
                id="paymentAccount"
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
              {partyType === "Supplier" && paymentAccount && (
                <InsufficientBalanceWarning
                  balance={selectedBalance}
                  amount={parsedAmount}
                  currency={selectedCurrency}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">
                {t("paymentAmount")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="memo">{t("remarks")}</Label>
              <Input
                id="memo"
                placeholder="Optional notes..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </div>

          {/* Invoice allocation table */}
          <div className="flex flex-col gap-2 flex-1 min-h-0">
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

            <ScrollArea className="flex-1 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t("invoice")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
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
                        colSpan={8}
                        className="h-16 text-center text-muted-foreground text-sm"
                      >
                        {t("loadingInvoices")}
                      </TableCell>
                    </TableRow>
                  ) : !invoices.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
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
                            onCheckedChange={(checked) => handleToggleInvoice(inv.name, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{inv.name}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {inv.posting_date}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{inv.due_date}</TableCell>
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
            </ScrollArea>

            {/* Totals row */}
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

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={createPayment.isPending || isInsufficientBalance}>
              {createPayment.isPending
                ? t("submitting")
                : partyType === "Customer"
                  ? t("receivePayment")
                  : t("makePayment")}
            </Button>
          </div>

          <StatusBar type={status.type} message={status.message} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
