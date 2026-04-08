import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type {
  JournalEntry,
  JournalEntryAccount,
  JournalEntryListItem,
} from "@/types/journal-entry";
import type { SalesInvoice } from "@/types/sales-invoice";

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export function useJournalEntry(name: string) {
  return useQuery({
    queryKey: queryKeys.journalEntries.detail(name),
    queryFn: () => frappe.getDoc<JournalEntry>("Journal Entry", name),
    enabled: !!name,
  });
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function useJournalEntryList(
  company: string,
  voucherType = "Journal Entry",
  remarkFilter?: string,
) {
  return useQuery({
    queryKey: queryKeys.journalEntries.list(company, voucherType + (remarkFilter ?? "")),
    queryFn: () => {
      const filters: unknown[] = [
        ["company", "=", company],
        ["voucher_type", "=", voucherType],
      ];
      if (remarkFilter) {
        filters.push(["user_remark", "like", `%${remarkFilter}%`]);
      }
      return frappe.getList<JournalEntryListItem>("Journal Entry", {
        filters,
        fields: ["name", "posting_date", "total_debit", "user_remark", "docstatus"],
        orderBy: "posting_date desc",
        limitPageLength: 50,
      });
    },
    enabled: !!company,
  });
}

// ---------------------------------------------------------------------------
// Create + Submit (one-shot)
// ---------------------------------------------------------------------------

interface CreateAndSubmitParams {
  postingDate: string;
  company: string;
  userRemark: string;
  accounts: JournalEntryAccount[];
  voucherType?: string;
  multiCurrency?: boolean;
  chequeNo?: string;
  chequeDate?: string;
  /** Suffix appended to the list cache key for optimistic updates (e.g. "[Expense]") */
  listKeySuffix?: string;
}

interface CreateAndSubmitResult {
  name: string;
  submitted: boolean;
  error?: string;
}

export function useCreateAndSubmitJournalEntry() {
  const qc = useQueryClient();

  return useMutation<CreateAndSubmitResult, Error, CreateAndSubmitParams>({
    mutationFn: async ({
      postingDate,
      company,
      userRemark,
      accounts,
      voucherType,
      multiCurrency,
      chequeNo,
      chequeDate,
    }) => {
      const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: voucherType ?? "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: postingDate,
        company,
        user_remark: userRemark,
        accounts,
        multi_currency: multiCurrency ? 1 : 0,
        ...(chequeNo ? { cheque_no: chequeNo } : {}),
        ...(chequeDate ? { cheque_date: chequeDate } : {}),
      });

      const fullDoc = await frappe.getDoc<JournalEntry>("Journal Entry", created.name);

      try {
        await frappe.submit<JournalEntry>(fullDoc as unknown as Record<string, unknown>);
        return { name: created.name, submitted: true };
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Submit failed";
        return { name: created.name, submitted: false, error: message };
      }
    },
    onSuccess: (result, variables) => {
      // Optimistically prepend the new entry into the matching list cache
      // Estimate total_debit in company currency for optimistic cache
      const totalDebit = variables.accounts.reduce((sum, acc) => {
        const debit = acc.debit_in_account_currency ?? 0;
        const rate = acc.exchange_rate && acc.exchange_rate !== 1 ? acc.exchange_rate : 1;
        return sum + Math.round(debit * rate * 100) / 100;
      }, 0);
      const newItem: JournalEntryListItem = {
        name: result.name,
        posting_date: variables.postingDate,
        total_debit: totalDebit,
        user_remark: variables.userRemark,
        docstatus: result.submitted ? 1 : 0,
      };
      const vt = variables.voucherType ?? "Journal Entry";
      const listKey = queryKeys.journalEntries.list(
        variables.company,
        vt + (variables.listKeySuffix ?? ""),
      );
      qc.setQueryData<JournalEntryListItem[]>(listKey, (old) =>
        old ? [newItem, ...old] : [newItem],
      );

      // Background refetch for accurate data
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances", "employee"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Create Draft (no submit)
// ---------------------------------------------------------------------------

export function useCreateJournalEntryDraft() {
  const qc = useQueryClient();

  return useMutation<{ name: string }, Error, CreateAndSubmitParams>({
    mutationFn: async ({
      postingDate,
      company,
      userRemark,
      accounts,
      voucherType,
      multiCurrency,
      chequeNo,
      chequeDate,
    }) => {
      const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: voucherType ?? "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: postingDate,
        company,
        user_remark: userRemark,
        accounts,
        multi_currency: multiCurrency ? 1 : 0,
        ...(chequeNo ? { cheque_no: chequeNo } : {}),
        ...(chequeDate ? { cheque_date: chequeDate } : {}),
      });
      return { name: created.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances", "employee"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Amend (cancel original + create new draft)
// ---------------------------------------------------------------------------

interface AmendParams {
  originalName: string;
  postingDate: string;
  company: string;
  userRemark: string;
  accounts: JournalEntryAccount[];
  multiCurrency?: boolean;
  voucherType?: string;
  chequeNo?: string;
  chequeDate?: string;
}

interface AmendResult {
  originalName: string;
  newName: string;
}

export function useAmendJournalEntry() {
  const qc = useQueryClient();

  return useMutation<AmendResult, Error, AmendParams>({
    mutationFn: async ({
      originalName,
      postingDate,
      company,
      userRemark,
      accounts,
      multiCurrency,
      voucherType,
      chequeNo,
      chequeDate,
    }) => {
      await frappe.cancel("Journal Entry", originalName);

      const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: voucherType ?? "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: postingDate,
        company,
        user_remark: userRemark,
        accounts,
        multi_currency: multiCurrency ? 1 : 0,
        ...(chequeNo ? { cheque_no: chequeNo } : {}),
        ...(chequeDate ? { cheque_date: chequeDate } : {}),
      });

      return { originalName, newName: created.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Update Draft + Submit
// ---------------------------------------------------------------------------

interface UpdateDraftAndSubmitParams {
  name: string;
  postingDate: string;
  userRemark: string;
  accounts: JournalEntryAccount[];
  multiCurrency?: boolean;
  chequeNo?: string;
  chequeDate?: string;
}

interface UpdateDraftAndSubmitResult {
  name: string;
  submitted: boolean;
  error?: string;
}

export function useUpdateDraftAndSubmit() {
  const qc = useQueryClient();

  return useMutation<UpdateDraftAndSubmitResult, Error, UpdateDraftAndSubmitParams>({
    mutationFn: async ({
      name,
      postingDate,
      userRemark,
      accounts,
      multiCurrency,
      chequeNo,
      chequeDate,
    }) => {
      const doc = await frappe.getDoc<JournalEntry>("Journal Entry", name);

      const modifiedDoc = {
        ...(doc as unknown as Record<string, unknown>),
        posting_date: postingDate,
        user_remark: userRemark,
        multi_currency: multiCurrency ? 1 : 0,
        ...(chequeNo ? { cheque_no: chequeNo } : {}),
        ...(chequeDate ? { cheque_date: chequeDate } : {}),
        accounts: accounts.map((acc) => ({
          ...acc,
          doctype: "Journal Entry Account" as const,
        })),
      };

      await frappe.save<JournalEntry>(modifiedDoc);

      const updatedDoc = await frappe.getDoc<JournalEntry>("Journal Entry", name);

      try {
        await frappe.submit<JournalEntry>(updatedDoc as unknown as Record<string, unknown>);
        return { name, submitted: true };
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Submit failed";
        return { name, submitted: false, error: message };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Save Draft (update without submitting)
// ---------------------------------------------------------------------------

interface SaveDraftParams {
  name: string;
  postingDate: string;
  userRemark: string;
  accounts: JournalEntryAccount[];
  multiCurrency?: boolean;
}

export function useSaveDraftJournalEntry() {
  const qc = useQueryClient();

  return useMutation<JournalEntry, Error, SaveDraftParams>({
    mutationFn: async ({ name, postingDate, userRemark, accounts, multiCurrency }) => {
      const doc = await frappe.getDoc<JournalEntry>("Journal Entry", name);
      const modifiedDoc = {
        ...(doc as unknown as Record<string, unknown>),
        posting_date: postingDate,
        user_remark: userRemark,
        multi_currency: multiCurrency ? 1 : 0,
        accounts: accounts.map((acc) => ({
          ...acc,
          doctype: "Journal Entry Account" as const,
        })),
      };
      return frappe.save<JournalEntry>(modifiedDoc);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Submit (standalone — for drafts from history panel)
// ---------------------------------------------------------------------------

interface SubmitParams {
  name: string;
}

export function useSubmitJournalEntry() {
  const qc = useQueryClient();

  return useMutation<JournalEntry, Error, SubmitParams>({
    mutationFn: async ({ name }) => {
      const fullDoc = await frappe.getDoc<JournalEntry>("Journal Entry", name);
      return frappe.submit<JournalEntry>(fullDoc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

interface CancelParams {
  name: string;
}

export function useCancelJournalEntry() {
  const qc = useQueryClient();

  return useMutation<void, Error, CancelParams>({
    mutationFn: async ({ name }) => {
      await frappe.cancel("Journal Entry", name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

interface DeleteParams {
  name: string;
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteParams>({
    mutationFn: async ({ name }) => {
      await frappe.deleteDoc("Journal Entry", name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Ice Cream Sale: Sales Invoice + remapping Journal Entry
// ---------------------------------------------------------------------------

interface IceCreamSaleParams {
  postingDate: string;
  company: string;
  employee: string;
  customer: string;
  customerARAccount: string;
  employeeAccount: string;
  incomeAccount: string;
  currency: string;
  exchangeRate: number;
  multiCurrency: boolean;
  userRemark: string;
  items: Array<{
    item_code: string;
    qty: number;
    rate: number;
    amount: number;
    uom?: string;
  }>;
}

export function useCreateIceCreamSale() {
  const qc = useQueryClient();

  return useMutation<{ siName: string; jeName: string }, Error, IceCreamSaleParams>({
    mutationFn: async (p) => {
      // Step 1: Create Sales Invoice (draft)
      const si = await frappe.createDoc<SalesInvoice>("Sales Invoice", {
        doctype: "Sales Invoice",
        customer: p.customer,
        posting_date: p.postingDate,
        company: p.company,
        currency: p.currency,
        conversion_rate: p.exchangeRate,
        debit_to: p.customerARAccount,
        selling_price_list: "Standard Selling",
        items: p.items.map((i) => ({
          doctype: "Sales Invoice Item",
          item_code: i.item_code,
          qty: i.qty,
          rate: i.rate,
          amount: i.amount,
          uom: i.uom,
          income_account: p.incomeAccount,
          allow_zero_valuation_rate: 1,
        })),
      });

      // Step 2: Fetch full doc (ERPNext adds server-side fields) then submit
      const fullSI = await frappe.getDoc<SalesInvoice>("Sales Invoice", si.name);
      await frappe.submit(fullSI as unknown as Record<string, unknown>);

      const total = p.items.reduce((s, i) => s + i.amount, 0);

      // Step 3: Create remapping JE (CR customer AR, DR employee receivable)
      const je = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: p.postingDate,
        company: p.company,
        user_remark: p.userRemark + ` [SI:${si.name}]`,
        multi_currency: p.multiCurrency ? 1 : 0,
        accounts: [
          {
            doctype: "Journal Entry Account",
            account: p.customerARAccount,
            party_type: "Customer",
            party: p.customer,
            credit_in_account_currency: total,
            exchange_rate: p.exchangeRate,
          },
          {
            doctype: "Journal Entry Account",
            account: p.employeeAccount,
            party_type: "Employee",
            party: p.employee,
            debit_in_account_currency: total,
            exchange_rate: p.exchangeRate,
          },
        ],
      });

      // Step 4: Fetch full JE doc then submit
      const fullJE = await frappe.getDoc<JournalEntry>("Journal Entry", je.name);
      await frappe.submit(fullJE as unknown as Record<string, unknown>);

      return { siName: si.name, jeName: je.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Cancel Ice Cream Sale (JE + SI paired cancel)
// ---------------------------------------------------------------------------

interface CancelIceCreamSaleParams {
  jeName: string;
  siName: string;
}

export function useCancelIceCreamSale() {
  const qc = useQueryClient();

  return useMutation<void, Error, CancelIceCreamSaleParams>({
    mutationFn: async ({ jeName, siName }) => {
      await frappe.cancel("Journal Entry", jeName);
      await frappe.cancel("Sales Invoice", siName);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries", "list"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["salesInvoices"] });
    },
  });
}
