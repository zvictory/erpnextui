"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { fetchExchangeRate } from "@/lib/multi-currency";
import { queryKeys } from "@/hooks/query-keys";
import { useCompanyStore } from "@/stores/company-store";
import type {
  OutstandingInvoice,
  PaymentReference,
  PaymentEntryListItem,
  PaymentEntry,
} from "@/types/payment-entry";

/** Sentinel thrown when the party has no outstanding invoices to allocate against. */
export const NO_OUTSTANDING_ERROR = "NO_OUTSTANDING";

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
          "base_grand_total",
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
  /** Golden rule: caller-provided counter-amount when currencies differ (sacred, not derived) */
  counterAmount?: number;
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

      // Verify payment account currency from ERPNext (caller may pass stale value)
      const [payAccDoc] = await frappe.getList<{ account_currency: string }>("Account", {
        filters: [["name", "=", paymentAccount]],
        fields: ["account_currency"],
        limitPageLength: 1,
      });
      const verifiedPaymentCurrency = payAccDoc?.account_currency ?? paymentAccountCurrency;

      // Determine paid_from / paid_to currencies
      const paidFromCurrency = isReceive ? partyAccountCurrency : verifiedPaymentCurrency;
      const paidToCurrency = isReceive ? verifiedPaymentCurrency : partyAccountCurrency;

      // ── GOLDEN RULE ──
      // Both amounts (paid_amount, received_amount) are SACRED user inputs.
      // Never derive one from the other via exchange rate math.
      // Exchange rates are derived from amounts so base values match exactly.

      let paidAmount: number;
      let receivedAmount: number;
      let sourceRate = 1;
      let targetRate = 1;

      if (paidFromCurrency === paidToCurrency) {
        paidAmount = amount;
        receivedAmount = amount;
        if (paidFromCurrency !== companyCurrency) {
          sourceRate =
            (await fetchExchangeRate(paidFromCurrency, companyCurrency, postingDate)) ?? 1;
          targetRate = sourceRate;
        }
      } else if (data.counterAmount !== undefined && data.counterAmount > 0) {
        // Both amounts provided by caller — golden rule path
        if (isReceive) {
          receivedAmount = amount;
          paidAmount = data.counterAmount;
        } else {
          paidAmount = amount;
          receivedAmount = data.counterAmount;
        }

        // Derive exchange rates from amounts
        if (paidFromCurrency === companyCurrency) {
          sourceRate = 1;
          targetRate = paidAmount / receivedAmount;
        } else if (paidToCurrency === companyCurrency) {
          targetRate = 1;
          sourceRate = receivedAmount / paidAmount;
        } else {
          // Neither is company currency — fetch one rate, derive the other
          sourceRate =
            (await fetchExchangeRate(paidFromCurrency, companyCurrency, postingDate)) ?? 1;
          const baseAmount = paidAmount * sourceRate;
          targetRate = receivedAmount > 0 ? baseAmount / receivedAmount : 1;
        }
      } else {
        // Fallback: single amount, fetch rates and derive counter-amount (legacy)
        // After rounding the derived amount, re-derive rates so
        // paidAmount × sourceRate === receivedAmount × targetRate exactly.
        if (paidFromCurrency !== companyCurrency) {
          sourceRate =
            (await fetchExchangeRate(paidFromCurrency, companyCurrency, postingDate)) ?? 1;
        }
        if (paidToCurrency !== companyCurrency) {
          targetRate = (await fetchExchangeRate(paidToCurrency, companyCurrency, postingDate)) ?? 1;
        }
        if (isReceive) {
          receivedAmount = amount;
          paidAmount = Math.round(((amount * targetRate) / sourceRate) * 100) / 100;
        } else {
          paidAmount = amount;
          receivedAmount = Math.round(((amount * sourceRate) / targetRate) * 100) / 100;
        }
        // Golden rule: re-derive rates from the now-rounded amounts
        if (paidFromCurrency === companyCurrency) {
          sourceRate = 1;
          targetRate = paidAmount / receivedAmount;
        } else if (paidToCurrency === companyCurrency) {
          targetRate = 1;
          sourceRate = receivedAmount / paidAmount;
        } else {
          // Neither is company currency — anchor source rate, adjust target
          const baseAmount = paidAmount * sourceRate;
          targetRate = receivedAmount > 0 ? baseAmount / receivedAmount : 1;
        }
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

/**
 * Auto-allocate a submitted Payment Entry against the party's outstanding invoices FIFO.
 *
 * Flow: cancel original → amend with sacred amounts + fresh refs[] built by FIFO-distributing
 * the party-side amount across outstanding invoices (oldest due first). Fixes PEs that were
 * submitted without references (showing up as "unallocated") and collapses base-currency drift
 * by re-deriving the exchange rate from the amounts in useCreatePaymentEntry's Golden Rule path.
 *
 * Throws `Error(NO_OUTSTANDING_ERROR)` if the party has no open invoices.
 */
export function useAutoAllocatePaymentEntry() {
  const qc = useQueryClient();
  const createPayment = useCreatePaymentEntry();
  const cancelPayment = useCancelPaymentEntry();
  return useMutation({
    mutationFn: async (name: string) => {
      const pe = await frappe.getDoc<PaymentEntry>("Payment Entry", name);

      if (pe.payment_type === "Internal Transfer") {
        throw new Error("Auto-allocate is not supported for Internal Transfer");
      }

      const isReceive = pe.payment_type === "Receive";
      const invoiceDoctype: "Sales Invoice" | "Purchase Invoice" = isReceive
        ? "Sales Invoice"
        : "Purchase Invoice";
      const partyField = isReceive ? "customer" : "supplier";

      const outstanding = await frappe.getList<OutstandingInvoice>(invoiceDoctype, {
        filters: [
          [partyField, "=", pe.party],
          ["docstatus", "=", 1],
          ["outstanding_amount", ">", 0],
          ["company", "=", pe.company],
        ],
        fields: [
          "name",
          "posting_date",
          "due_date",
          "grand_total",
          "base_grand_total",
          "outstanding_amount",
          "currency",
        ],
        orderBy: "due_date asc",
      });

      if (outstanding.length === 0) {
        throw new Error(NO_OUTSTANDING_ERROR);
      }

      // Pool = party-side amount (matches invoice currency for FIFO distribution).
      // Receive: paid_from = AR (party). Pay: paid_to = AP (party).
      const pool = isReceive ? pe.paid_amount : pe.received_amount;

      let remaining = pool;
      const refs: PaymentReference[] = [];
      for (const inv of outstanding) {
        if (remaining <= 0.001) break;
        const allocated = Math.min(inv.outstanding_amount, remaining);
        if (allocated <= 0) continue;
        refs.push({
          reference_doctype: invoiceDoctype,
          reference_name: inv.name,
          total_amount: inv.grand_total,
          outstanding_amount: inv.outstanding_amount,
          allocated_amount: allocated,
        });
        remaining = Math.max(0, remaining - allocated);
      }

      await cancelPayment.mutateAsync(name);

      // Bank-side is what the user originally typed (amount); counterAmount is party-side.
      const paymentAccount = isReceive ? pe.paid_to : pe.paid_from;
      const paymentAccountCurrency = isReceive
        ? pe.paid_to_account_currency
        : pe.paid_from_account_currency;
      const amount = isReceive ? pe.received_amount : pe.paid_amount;
      const counterAmount = isReceive ? pe.paid_amount : pe.received_amount;

      const companyCurrency = useCompanyStore.getState().currencyCode;

      return createPayment.mutateAsync({
        partyType: pe.party_type,
        party: pe.party,
        company: pe.company,
        companyCurrency,
        postingDate: pe.posting_date,
        paymentAccount,
        paymentAccountCurrency: paymentAccountCurrency ?? "",
        amount,
        counterAmount: amount !== counterAmount ? counterAmount : undefined,
        referenceNo: pe.reference_no ?? "",
        referenceDate: pe.reference_date ?? "",
        remarks: pe.remarks ?? "",
        allocations: refs,
        amendedFrom: name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
      qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["currencyAudit"] });
    },
  });
}
