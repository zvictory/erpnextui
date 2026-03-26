"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type {
  OutstandingInvoice,
  PaymentReference,
  PaymentEntryListItem,
  PaymentEntry,
} from "@/types/payment-entry";

const PAGE_SIZE = 20;

export function useOutstandingInvoices(
  partyType: "Customer" | "Supplier",
  partyName: string,
  company: string,
) {
  return useQuery({
    queryKey: queryKeys.paymentEntries.outstanding(partyType, partyName, company),
    queryFn: async () => {
      const doctype = partyType === "Customer" ? "Sales Invoice" : "Purchase Invoice";
      const partyField = partyType === "Customer" ? "customer" : "supplier";
      return frappe.getList<OutstandingInvoice>(doctype, {
        filters: [
          [partyField, "=", partyName],
          ["docstatus", "=", 1],
          ["outstanding_amount", ">", 0],
          ["company", "=", company],
        ],
        fields: [
          "name",
          "posting_date",
          "due_date",
          "grand_total",
          "outstanding_amount",
          "currency",
        ],
        orderBy: "due_date asc",
      });
    },
    enabled: !!partyName && !!company,
  });
}

interface CreatePaymentEntryInput {
  partyType: "Customer" | "Supplier";
  party: string;
  company: string;
  companyCurrency: string;
  postingDate: string;
  paymentAccount: string;
  paymentAccountCurrency: string;
  amount: number;
  referenceNo: string;
  referenceDate: string;
  remarks: string;
  allocations: PaymentReference[];
  /** Customer/supplier default currency — used to pick the correct AR/AP account for advance payments */
  partyCurrency?: string;
  /** Original payment entry name when amending a cancelled payment */
  amendedFrom?: string;
}

/** Fetch exchange rate: 1 fromCurrency = X toCurrency. Returns null if not found. */
async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date: string,
): Promise<number | null> {
  const records = await frappe.getList<{ exchange_rate: number }>("Currency Exchange", {
    filters: [
      ["from_currency", "=", fromCurrency],
      ["to_currency", "=", toCurrency],
      ["date", "<=", date],
    ],
    fields: ["exchange_rate"],
    orderBy: "date desc",
    limitPageLength: 1,
  });
  if (records.length > 0) return records[0].exchange_rate;

  // Try reverse pair and invert
  const reverse = await frappe.getList<{ exchange_rate: number }>("Currency Exchange", {
    filters: [
      ["from_currency", "=", toCurrency],
      ["to_currency", "=", fromCurrency],
      ["date", "<=", date],
    ],
    fields: ["exchange_rate"],
    orderBy: "date desc",
    limitPageLength: 1,
  });
  if (reverse.length > 0 && reverse[0].exchange_rate > 0) return 1 / reverse[0].exchange_rate;

  return null;
}

export function useCreatePaymentEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePaymentEntryInput) => {
      const {
        partyType,
        party,
        company,
        companyCurrency,
        postingDate,
        paymentAccount,
        paymentAccountCurrency,
        amount,
        referenceNo,
        referenceDate,
        remarks,
        allocations,
        partyCurrency,
        amendedFrom,
      } = data;
      const isReceive = partyType === "Customer";

      // Look up the AR/AP account — must match the invoice's party account
      let partyAccount: string;
      let partyAccountCurrency: string;

      if (allocations.length > 0) {
        // Get party account from the first referenced invoice to ensure it matches
        const ref = allocations[0];
        const partyAccountField =
          ref.reference_doctype === "Sales Invoice" ? "debit_to" : "credit_to";
        const [invoiceDoc] = await frappe.getList<Record<string, string>>(ref.reference_doctype, {
          filters: [["name", "=", ref.reference_name]],
          fields: [partyAccountField],
          limitPageLength: 1,
        });
        if (!invoiceDoc) throw new Error(`Invoice ${ref.reference_name} not found`);
        const accountName = invoiceDoc[partyAccountField];

        const [accDoc] = await frappe.getList<{ name: string; account_currency: string }>(
          "Account",
          {
            filters: [["name", "=", accountName]],
            fields: ["name", "account_currency"],
            limitPageLength: 1,
          },
        );
        if (!accDoc) throw new Error(`Account ${accountName} not found`);
        partyAccount = accDoc.name;
        partyAccountCurrency = accDoc.account_currency;
      } else {
        // Advance payment — pick AR/AP account matching the party's currency
        const accountType = isReceive ? "Receivable" : "Payable";
        const filters: unknown[] = [
          ["account_type", "=", accountType],
          ["company", "=", company],
          ["is_group", "=", 0],
        ];
        if (partyCurrency) {
          filters.push(["account_currency", "=", partyCurrency]);
        }
        const accounts = await frappe.getList<{ name: string; account_currency: string }>(
          "Account",
          { filters, fields: ["name", "account_currency"], limitPageLength: 1 },
        );
        if (!accounts.length) {
          throw new Error(
            `No ${accountType} account found for company ${company}` +
              (partyCurrency ? ` with currency ${partyCurrency}` : ""),
          );
        }
        partyAccount = accounts[0].name;
        partyAccountCurrency = accounts[0].account_currency;
      }

      // Determine paid_from / paid_to currencies
      const paidFromCurrency = isReceive ? partyAccountCurrency : paymentAccountCurrency;
      const paidToCurrency = isReceive ? paymentAccountCurrency : partyAccountCurrency;

      // Exchange rates: "1 account_currency = X company_currency"
      let sourceRate = 1;
      let targetRate = 1;

      if (paidFromCurrency !== companyCurrency) {
        sourceRate = (await fetchExchangeRate(paidFromCurrency, companyCurrency, postingDate)) ?? 1;
      }
      if (paidToCurrency !== companyCurrency) {
        targetRate = (await fetchExchangeRate(paidToCurrency, companyCurrency, postingDate)) ?? 1;
      }

      // User enters amount in the bank account's currency.
      // Receive: amount = received_amount (bank receives); Pay: amount = paid_amount (bank pays)
      let paidAmount: number;
      let receivedAmount: number;

      if (isReceive) {
        receivedAmount = amount;
        paidAmount = sourceRate === 0 ? amount : (amount * targetRate) / sourceRate;
      } else {
        paidAmount = amount;
        receivedAmount = targetRate === 0 ? amount : (amount * sourceRate) / targetRate;
      }

      const doc: Record<string, unknown> = {
        doctype: "Payment Entry",
        payment_type: isReceive ? "Receive" : "Pay",
        posting_date: postingDate,
        party_type: partyType,
        party,
        company,
        paid_from: isReceive ? partyAccount : paymentAccount,
        paid_to: isReceive ? paymentAccount : partyAccount,
        paid_from_account_currency: paidFromCurrency,
        paid_to_account_currency: paidToCurrency,
        source_exchange_rate: sourceRate,
        target_exchange_rate: targetRate,
        paid_amount: paidAmount,
        received_amount: receivedAmount,
        reference_no: referenceNo || postingDate,
        reference_date: referenceDate || postingDate,
        remarks: remarks || undefined,
        amended_from: amendedFrom || undefined,
        references: allocations.map((a) => ({
          doctype: "Payment Entry Reference",
          reference_doctype: a.reference_doctype,
          reference_name: a.reference_name,
          total_amount: a.total_amount,
          outstanding_amount: a.outstanding_amount,
          allocated_amount: a.allocated_amount,
        })),
      };

      // Two-step: save (draft) then submit
      const saved = await frappe.save<Record<string, unknown>>(doc);
      return frappe.submit<Record<string, unknown>>(saved);
    },
    onSuccess: (_data, variables) => {
      const { partyType, party, company } = variables;
      qc.invalidateQueries({
        queryKey: queryKeys.paymentEntries.outstanding(partyType, party, company),
      });
      qc.invalidateQueries({ queryKey: ["paymentEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (variables.partyType === "Customer") {
        qc.invalidateQueries({ queryKey: ["salesInvoices"] });
      } else {
        qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      }
    },
  });
}

export function usePaymentEntryList(
  company: string,
  page: number,
  search: string,
  sort: string,
  extraFilters?: unknown[],
) {
  return useQuery({
    queryKey: [...queryKeys.paymentEntries.list(company, page, search, sort), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["party_name", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getList<PaymentEntryListItem>("Payment Entry", {
        filters,
        fields: [
          "name",
          "payment_type",
          "posting_date",
          "party_type",
          "party",
          "party_name",
          "paid_amount",
          "received_amount",
          "paid_from",
          "paid_to",
          "paid_from_account_currency",
          "paid_to_account_currency",
          "status",
          "docstatus",
        ],
        orderBy: sort || "posting_date desc,creation desc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function usePaymentEntryCount(company: string, search: string, extraFilters?: unknown[]) {
  return useQuery({
    queryKey: [...queryKeys.paymentEntries.count(company, search), extraFilters],
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (search) {
        filters.push(["party_name", "like", `%${search}%`]);
      }
      if (extraFilters) {
        filters.push(...extraFilters);
      }
      return frappe.getCount("Payment Entry", filters);
    },
    enabled: !!company,
  });
}

export function usePaymentEntry(name: string) {
  return useQuery({
    queryKey: queryKeys.paymentEntries.detail(name),
    queryFn: () => frappe.getDoc<PaymentEntry>("Payment Entry", name),
    enabled: !!name,
  });
}

export function useSubmitPaymentEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const doc = await frappe.getDoc<PaymentEntry>("Payment Entry", name);
      return frappe.submit<PaymentEntry>(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCancelPaymentEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.cancel("Payment Entry", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeletePaymentEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Payment Entry", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentEntries"] });
    },
  });
}
