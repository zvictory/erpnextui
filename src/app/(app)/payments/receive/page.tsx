"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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
import {
  useOutstandingInvoices,
  useCreatePaymentEntry,
  usePaymentEntry,
} from "@/hooks/use-payment-entries";
import { useCustomer } from "@/hooks/use-customers";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
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
  const prefilledAmount = searchParams.get("amount") ?? "";
  const amendFrom = searchParams.get("amend_from") ?? "";
  const { data: amendDoc } = usePaymentEntry(amendFrom);

  type FormState = {
    customer: string;
    postingDate: string;
    paymentAccount: string;
    amount: string;
    counterAmount: string;
    remarks: string;
    amendApplied: boolean;
    selections: Record<string, boolean>;
    allocations: Record<string, string>;
  };
  type FormAction =
    | {
        type: "APPLY_AMEND";
        customer: string;
        amount: string;
        paymentAccount: string;
        remarks: string;
      }
    | { type: "CHANGE_CUSTOMER"; customer: string }
    | {
        type: "SET_FIELD";
        field: keyof Omit<FormState, "amendApplied" | "selections" | "allocations">;
        value: string;
      }
    | { type: "SET_SELECTIONS"; selections: Record<string, boolean> }
    | { type: "SET_ALLOCATIONS"; allocations: Record<string, string> };

  const [form, dispatch] = useReducer(
    (state: FormState, action: FormAction): FormState => {
      switch (action.type) {
        case "APPLY_AMEND":
          return {
            ...state,
            customer: action.customer,
            amount: action.amount,
            paymentAccount: action.paymentAccount,
            remarks: action.remarks,
            amendApplied: true,
          };
        case "CHANGE_CUSTOMER":
          return {
            ...state,
            customer: action.customer,
            selections: {},
            allocations: {},
            paymentAccount: "",
            counterAmount: "",
          };
        case "SET_FIELD":
          return { ...state, [action.field]: action.value };
        case "SET_SELECTIONS":
          return { ...state, selections: action.selections };
        case "SET_ALLOCATIONS":
          return { ...state, allocations: action.allocations };
        default:
          return state;
      }
    },
    null,
    (): FormState => ({
      customer: prefilledCustomer,
      postingDate: getToday(),
      paymentAccount: "",
      amount: prefilledAmount,
      counterAmount: "",
      remarks: "",
      amendApplied: false,
      selections: {},
      allocations: {},
    }),
  );

  const {
    customer,
    postingDate,
    paymentAccount,
    amount,
    counterAmount,
    remarks,
    amendApplied,
    selections,
    allocations,
  } = form;
  const setCustomer = (v: string) => dispatch({ type: "CHANGE_CUSTOMER", customer: v });
  const setPostingDate = (v: string) =>
    dispatch({ type: "SET_FIELD", field: "postingDate", value: v });
  const setPaymentAccount = (v: string) =>
    dispatch({ type: "SET_FIELD", field: "paymentAccount", value: v });
  const setAmount = (v: string) => dispatch({ type: "SET_FIELD", field: "amount", value: v });
  const setCounterAmount = (v: string) =>
    dispatch({ type: "SET_FIELD", field: "counterAmount", value: v });
  const setRemarks = (v: string) => dispatch({ type: "SET_FIELD", field: "remarks", value: v });
  const setSelections = (
    v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => {
    if (typeof v === "function") {
      dispatch({ type: "SET_SELECTIONS", selections: v(selections) });
    } else {
      dispatch({ type: "SET_SELECTIONS", selections: v });
    }
  };
  const setAllocations = (
    v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => {
    if (typeof v === "function") {
      dispatch({ type: "SET_ALLOCATIONS", allocations: v(allocations) });
    } else {
      dispatch({ type: "SET_ALLOCATIONS", allocations: v });
    }
  };

  // Pre-fill from amend source once loaded (single dispatch — no cascading renders)
  useEffect(() => {
    if (amendDoc && !amendApplied) {
      dispatch({
        type: "APPLY_AMEND",
        customer: amendDoc.party,
        amount: String(amendDoc.paid_amount),
        paymentAccount: amendDoc.paid_to,
        remarks: amendDoc.remarks ?? "",
      });
    }
  }, [amendDoc, amendApplied]);

  const { data: customerDoc } = useCustomer(customer);
  const partyCurrency = customerDoc?.default_currency ?? "";

  const { data: invoices = [], isLoading: loadingInvoices } = useOutstandingInvoices(
    "Customer",
    customer,
    company,
  );
  const { data: currencyMap } = useCurrencyMap();

  // Per-invoice outstanding in document currency for display and allocation.
  // outstanding_amount from ERPNext is in receivable account currency (typically company currency).
  // When the invoice currency differs, convert via grand_total / base_grand_total.
  const { docOutstandingMap, accountRateMap } = useMemo(() => {
    const docMap = new Map<string, number>();
    const rateMap = new Map<string, number>();
    for (const inv of invoices) {
      const needsConversion =
        inv.currency != null &&
        inv.currency !== companyCurrency &&
        inv.base_grand_total > 0 &&
        inv.outstanding_amount <= inv.base_grand_total * 1.01;
      const raw = needsConversion
        ? inv.grand_total * (inv.outstanding_amount / inv.base_grand_total)
        : inv.outstanding_amount;
      docMap.set(inv.name, inv.currency === "UZS" ? Math.round(raw) : raw);
      rateMap.set(
        inv.name,
        needsConversion && inv.grand_total > 0 ? inv.base_grand_total / inv.grand_total : 1,
      );
    }
    return { docOutstandingMap: docMap, accountRateMap: rateMap };
  }, [invoices, companyCurrency]);

  const balances = useMemo(() => {
    if (!invoices.length) return [];
    const byCurrency = new Map<string, number>();
    for (const inv of invoices) {
      const curr = inv.currency ?? "";
      if (!curr) continue;
      byCurrency.set(
        curr,
        (byCurrency.get(curr) ?? 0) + (docOutstandingMap.get(inv.name) ?? inv.outstanding_amount),
      );
    }
    return Array.from(byCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .filter((b) => Math.abs(b.amount) > 0.005);
  }, [invoices, docOutstandingMap]);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedCounterAmount = parseFloat(counterAmount) || 0;

  const selectedAccount = bankAccounts.find((a) => a.name === paymentAccount);
  const selectedCurrency = selectedAccount?.account_currency ?? "";

  // Multi-currency: bank account currency ≠ party/invoice currency
  const isMultiCurrency =
    selectedCurrency !== "" && partyCurrency !== "" && selectedCurrency !== partyCurrency;

  // Auto-fetch exchange rate for suggesting counter amount
  const { data: fetchedRate } = useExchangeRate(
    isMultiCurrency ? partyCurrency : "",
    isMultiCurrency ? selectedCurrency : "",
    postingDate,
  );

  // Derive suggested counter amount from bank amount + fetched rate
  const suggestedCounter = useMemo(() => {
    if (!isMultiCurrency || !fetchedRate || fetchedRate <= 0 || !parsedAmount) return null;
    // fetchedRate = "1 partyCurrency = X bankCurrency"
    return Math.round((parsedAmount / fetchedRate) * 100) / 100;
  }, [isMultiCurrency, fetchedRate, parsedAmount]);

  // Auto-fill counter amount when bank amount or rate changes
  useEffect(() => {
    if (suggestedCounter !== null && suggestedCounter > 0) {
      setCounterAmount(String(suggestedCounter));
    }
  }, [suggestedCounter]);

  // Display exchange rate derived from both amounts
  const displayRate = useMemo(() => {
    if (!isMultiCurrency || !parsedAmount || !parsedCounterAmount) return "";
    if (selectedCurrency === companyCurrency) {
      return formatNumber(parsedAmount / parsedCounterAmount, 2);
    }
    if (partyCurrency === companyCurrency) {
      return formatNumber(parsedCounterAmount / parsedAmount, 2);
    }
    return formatNumber(parsedAmount / parsedCounterAmount, 4);
  }, [
    isMultiCurrency,
    parsedAmount,
    parsedCounterAmount,
    selectedCurrency,
    partyCurrency,
    companyCurrency,
  ]);

  // Allocation pool: in multi-currency mode, allocations are in party currency
  const allocationPool = isMultiCurrency ? parsedCounterAmount : parsedAmount;

  const totalAllocated = invoices.reduce((sum, inv) => {
    if (!selections[inv.name]) return sum;
    return sum + (parseFloat(allocations[inv.name]) || 0);
  }, 0);

  const isOverAllocated = totalAllocated > allocationPool + 0.005;
  const isBalanced = Math.abs(totalAllocated - allocationPool) < 0.005;

  /** Distribute `total` across selected invoices FIFO (due_date asc), in document currency. */
  const computeAllocations = (selected: Record<string, boolean>, total: number) => {
    const alloc: Record<string, string> = {};
    let remaining = total;
    for (const inv of invoices) {
      if (!selected[inv.name]) continue;
      const docOut = docOutstandingMap.get(inv.name) ?? inv.outstanding_amount;
      const amt = Math.min(docOut, remaining);
      alloc[inv.name] = String(amt);
      remaining = Math.max(0, remaining - amt);
    }
    return alloc;
  };

  const handleSelectAll = () => {
    const allSelected: Record<string, boolean> = {};
    invoices.forEach((inv) => {
      allSelected[inv.name] = true;
    });

    const totalOutstanding = invoices.reduce(
      (s, inv) => s + (docOutstandingMap.get(inv.name) ?? inv.outstanding_amount),
      0,
    );

    if (isMultiCurrency) {
      if (!parsedCounterAmount) {
        setCounterAmount(totalOutstanding > 0 ? String(totalOutstanding) : "");
      }
      if (!parsedAmount && fetchedRate && fetchedRate > 0) {
        const suggested = Math.round(totalOutstanding * fetchedRate * 100) / 100;
        setAmount(suggested > 0 ? String(suggested) : "");
      }
    } else {
      if (!parsedAmount) {
        setAmount(totalOutstanding > 0 ? String(totalOutstanding) : "");
      }
    }

    const pool = isMultiCurrency
      ? parsedCounterAmount || totalOutstanding
      : parsedAmount || totalOutstanding;
    const alloc = computeAllocations(allSelected, pool);

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
    setCounterAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !paymentAccount || parsedAmount <= 0) return;
    if (isOverAllocated) return;

    const checkedInvoices = invoices.filter(
      (inv) => selections[inv.name] && (parseFloat(allocations[inv.name]) || 0) > 0,
    );

    const refs: PaymentReference[] = checkedInvoices.map((inv) => {
      const allocInDocCurrency = parseFloat(allocations[inv.name]) || 0;
      const rate = accountRateMap.get(inv.name) ?? 1;
      return {
        reference_doctype: "Sales Invoice",
        reference_name: inv.name,
        total_amount: inv.grand_total,
        outstanding_amount: inv.outstanding_amount,
        allocated_amount: Math.round(allocInDocCurrency * rate * 100) / 100,
      };
    });

    try {
      const acct = bankAccounts.find((a) => a.name === paymentAccount);
      await createPayment.mutateAsync({
        partyType: "Customer",
        party: customer,
        company,
        companyCurrency,
        postingDate,
        paymentAccount,
        paymentAccountCurrency: acct?.account_currency ?? companyCurrency,
        amount: parsedAmount,
        referenceNo: "",
        referenceDate: "",
        remarks,
        allocations: refs,
        partyCurrency: partyCurrency || undefined,
        amendedFrom: amendFrom || undefined,
        counterAmount: isMultiCurrency ? parsedCounterAmount : undefined,
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
              descriptionField="customer_name"
              displayValue={customerDoc?.customer_name}
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
              {bankAccounts.map((acc) => (
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
              {t("paymentAmount")}
              {selectedCurrency ? ` (${selectedCurrency})` : ""}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <NumberInput
              value={amount ? parseFloat(amount) : undefined}
              onChange={(v) => setAmount(String(v))}
              min={0}
              decimals={0}
              placeholder="0"
            />
          </div>

          {/* Exchange rate box — shown only when currencies differ */}
          {isMultiCurrency && (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 space-y-2.5 sm:col-span-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t("counterAmount")} ({partyCurrency})
                </Label>
                <NumberInput
                  value={counterAmount ? parseFloat(counterAmount) : undefined}
                  onChange={(v) => setCounterAmount(String(v))}
                  min={0}
                  decimals={2}
                  placeholder="0"
                />
              </div>
              {parsedAmount > 0 && parsedCounterAmount > 0 && displayRate && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {formatNumber(parsedAmount, 0)}&nbsp;{selectedCurrency}
                  <span className="mx-1.5 opacity-40">&rarr;</span>
                  {formatNumber(parsedCounterAmount, 2)}&nbsp;{partyCurrency}
                  <span className="mx-1.5 opacity-40">@</span>
                  {displayRate}
                </p>
              )}
            </div>
          )}

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
                                .reduce(
                                  (sum, i) =>
                                    sum + (docOutstandingMap.get(i.name) ?? i.outstanding_amount),
                                  0,
                                );
                              if (isMultiCurrency) {
                                if (!parsedCounterAmount) {
                                  setCounterAmount(
                                    selectedOutstanding > 0 ? String(selectedOutstanding) : "",
                                  );
                                }
                                if (!parsedAmount && fetchedRate && fetchedRate > 0) {
                                  const suggested =
                                    Math.round(selectedOutstanding * fetchedRate * 100) / 100;
                                  setAmount(suggested > 0 ? String(suggested) : "");
                                }
                              } else {
                                if (!parsedAmount) {
                                  setAmount(
                                    selectedOutstanding > 0 ? String(selectedOutstanding) : "",
                                  );
                                }
                              }
                              const pool = isMultiCurrency
                                ? parsedCounterAmount || selectedOutstanding
                                : parsedAmount || selectedOutstanding;
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
                          {formatNumber(
                            docOutstandingMap.get(inv.name) ?? inv.outstanding_amount,
                          )}
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
                <span className="font-semibold tabular-nums">{formatNumber(allocationPool)}</span>
              </span>
              {isBalanced && allocationPool > 0 && (
                <CheckCircle2 className="size-4 text-green-600 shrink-0" />
              )}
              {allocationPool > 0 &&
                !isOverAllocated &&
                !isBalanced &&
                totalAllocated < allocationPool && (
                  <span className="text-muted-foreground">
                    {t("remaining")} {formatNumber(allocationPool - totalAllocated)}{" "}
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
              isOverAllocated ||
              (isMultiCurrency && parsedCounterAmount <= 0)
            }
          >
            {createPayment.isPending ? t("submitting") : t("receivePayment")}
          </Button>
        </div>
      </form>
    </FormPageLayout>
  );
}
