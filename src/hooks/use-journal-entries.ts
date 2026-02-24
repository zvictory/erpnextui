import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type {
  JournalEntry,
  JournalEntryAccount,
  JournalEntryListItem,
} from "@/types/journal-entry";

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function useJournalEntryList(company: string) {
  return useQuery({
    queryKey: queryKeys.journalEntries.list(company),
    queryFn: () =>
      frappe.getList<JournalEntryListItem>("Journal Entry", {
        filters: [
          ["company", "=", company],
          ["voucher_type", "=", "Journal Entry"],
        ],
        fields: [
          "name",
          "posting_date",
          "total_debit",
          "user_remark",
          "docstatus",
        ],
        orderBy: "posting_date desc,creation desc",
        limitPageLength: 50,
      }),
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
}

interface CreateAndSubmitResult {
  name: string;
  submitted: boolean;
  error?: string;
}

export function useCreateAndSubmitJournalEntry() {
  const qc = useQueryClient();

  return useMutation<CreateAndSubmitResult, Error, CreateAndSubmitParams>({
    mutationFn: async ({ postingDate, company, userRemark, accounts }) => {
      const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: postingDate,
        company,
        user_remark: userRemark,
        accounts,
      });

      const fullDoc = await frappe.getDoc<JournalEntry>(
        "Journal Entry",
        created.name,
      );

      try {
        await frappe.submit<JournalEntry>(
          fullDoc as unknown as Record<string, unknown>,
        );
        return { name: created.name, submitted: true };
      } catch (submitError) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : "Submit failed";
        return { name: created.name, submitted: false, error: message };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["journalEntries", "list"],
      });
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
    }) => {
      await frappe.cancel("Journal Entry", originalName);

      const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: postingDate,
        company,
        user_remark: userRemark,
        accounts,
      });

      return { originalName, newName: created.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["journalEntries", "list"],
      });
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
}

interface UpdateDraftAndSubmitResult {
  name: string;
  submitted: boolean;
  error?: string;
}

export function useUpdateDraftAndSubmit() {
  const qc = useQueryClient();

  return useMutation<
    UpdateDraftAndSubmitResult,
    Error,
    UpdateDraftAndSubmitParams
  >({
    mutationFn: async ({ name, postingDate, userRemark, accounts }) => {
      const doc = await frappe.getDoc<JournalEntry>("Journal Entry", name);

      const modifiedDoc = {
        ...(doc as unknown as Record<string, unknown>),
        posting_date: postingDate,
        user_remark: userRemark,
        accounts: accounts.map((acc) => ({
          ...acc,
          doctype: "Journal Entry Account" as const,
        })),
      };

      await frappe.save<JournalEntry>(modifiedDoc);

      const updatedDoc = await frappe.getDoc<JournalEntry>(
        "Journal Entry",
        name,
      );

      try {
        await frappe.submit<JournalEntry>(
          updatedDoc as unknown as Record<string, unknown>,
        );
        return { name, submitted: true };
      } catch (submitError) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : "Submit failed";
        return { name, submitted: false, error: message };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["journalEntries", "list"],
      });
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
      const fullDoc = await frappe.getDoc<JournalEntry>(
        "Journal Entry",
        name,
      );
      return frappe.submit<JournalEntry>(
        fullDoc as unknown as Record<string, unknown>,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["journalEntries", "list"],
      });
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
      qc.invalidateQueries({
        queryKey: ["journalEntries", "list"],
      });
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
      qc.invalidateQueries({
        queryKey: ["journalEntries", "list"],
      });
    },
  });
}
