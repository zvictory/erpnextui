"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import { getToday } from "@/lib/utils";
import { useCBURates } from "@/hooks/use-exchange-rates";
import { useCompanyStore } from "@/stores/company-store";
import type {
  Account,
  AccountWithCurrency,
  AccountDetail,
  BankAccountListItem,
  COAAccountListItem,
  GLEntry,
  LedgerEntry,
} from "@/types/account";
import type { Currency } from "@/types/company";
import type { BankAccountFormValues, GeneralAccountFormValues } from "@/lib/schemas/account-schema";

const PAGE_SIZE = 20;
const GL_PAGE_SIZE = 50;

/**
 * Batch-fetch balances for multiple accounts in a single RPC call.
 * Falls back to individual get_balance_on calls if batch method unavailable.
 */
async function fetchBalancesBatch(
  accountNames: string[],
  date: string,
): Promise<Map<string, { balance: number; baseBalance: number }>> {
  const map = new Map<string, { balance: number; baseBalance: number }>();
  if (!accountNames.length) return map;

  try {
    const result = await frappe.call<Record<string, { balance: number; base_balance: number }>>(
      "frappe.stable_erp_api.get_balances_batch",
      {
        accounts: JSON.stringify(accountNames),
        date,
      },
    );
    for (const [name, b] of Object.entries(result)) {
      map.set(name, { balance: b.balance, baseBalance: b.base_balance });
    }
    return map;
  } catch {
    // Fallback: individual calls (account currency + base currency)
    const [balances, baseBalances] = await Promise.all([
      Promise.all(
        accountNames.map((acc) =>
          frappe
            .call<number>("erpnext.accounts.utils.get_balance_on", {
              account: acc,
              date,
            })
            .catch(() => 0),
        ),
      ),
      Promise.all(
        accountNames.map((acc) =>
          frappe
            .call<number>("erpnext.accounts.utils.get_balance_on", {
              account: acc,
              date,
              in_account_currency: false,
            })
            .catch(() => 0),
        ),
      ),
    ]);
    accountNames.forEach((name, i) => {
      map.set(name, {
        balance: balances[i] ?? 0,
        baseBalance: baseBalances[i] ?? 0,
      });
    });
    return map;
  }
}

export function useAccountCurrency(accountName: string) {
  return useQuery({
    queryKey: ["accountCurrency", accountName],
    queryFn: async () => {
      const doc = await frappe.getDoc<{ account_currency: string }>("Account", accountName);
      return doc.account_currency;
    },
    enabled: !!accountName,
  });
}

export function useBankAccountsWithCurrency(company: string) {
  return useQuery({
    queryKey: queryKeys.accounts.bankWithCurrency(company),
    queryFn: async () => {
      const accounts = await frappe.getList<AccountWithCurrency>("Account", {
        filters: [
          ["account_type", "in", ["Bank", "Cash"]],
          ["is_group", "=", 0],
          ["disabled", "=", 0],
          ["company", "=", company],
        ],
        fields: ["name", "account_currency"],
      });

      const balanceMap = await fetchBalancesBatch(
        accounts.map((a) => a.name),
        getToday(),
      );

      return accounts.map((acc) => ({
        ...acc,
        balance: balanceMap.get(acc.name)?.balance ?? 0,
      }));
    },
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBankAccounts(company: string) {
  return useQuery({
    queryKey: queryKeys.accounts.bank(company),
    queryFn: async () => {
      const accounts = await frappe.getList<Account>("Account", {
        filters: [
          ["account_type", "in", ["Bank", "Cash"]],
          ["is_group", "=", 0],
          ["disabled", "=", 0],
          ["company", "=", company],
        ],
        fields: ["name"],
      });
      return accounts.map((a) => a.name);
    },
    enabled: !!company,
  });
}

export function useExpenseAccountsWithCurrency(company: string) {
  return useQuery({
    queryKey: queryKeys.accounts.expenseWithCurrency(company),
    queryFn: async () => {
      return frappe.getList<AccountWithCurrency>("Account", {
        filters: [
          ["root_type", "=", "Expense"],
          ["is_group", "=", 0],
          ["disabled", "=", 0],
          ["company", "=", company],
        ],
        fields: ["name", "account_currency"],
        limitPageLength: 0,
      });
    },
    enabled: !!company,
  });
}

export function useExpenseAccounts(company: string) {
  return useQuery({
    queryKey: queryKeys.accounts.expense(company),
    queryFn: async () => {
      const accounts = await frappe.getList<Account>("Account", {
        filters: [
          ["root_type", "=", "Expense"],
          ["is_group", "=", 0],
          ["disabled", "=", 0],
          ["company", "=", company],
        ],
        fields: ["name"],
        limitPageLength: 0,
      });
      return accounts.map((a) => a.name);
    },
    enabled: !!company,
  });
}

// --- Bank Account Queries ---

export function useBankAccountList(company: string, page: number, search: string, sort: string) {
  return useQuery({
    queryKey: queryKeys.bankAccounts.list(company, page, search, sort),
    queryFn: async () => {
      const filters: unknown[] = [
        ["account_type", "=", "Bank"],
        ["is_group", "=", 0],
        ["company", "=", company],
      ];
      if (search) filters.push(["account_name", "like", `%${search}%`]);

      const accounts = await frappe.getList<BankAccountListItem>("Account", {
        filters,
        fields: ["name", "account_name", "account_currency", "bank_name"],
        orderBy: sort || "account_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });

      const balanceMap = await fetchBalancesBatch(
        accounts.map((a) => a.name),
        getToday(),
      );

      return accounts.map((acc) => ({
        ...acc,
        balance: balanceMap.get(acc.name)?.balance ?? 0,
      }));
    },
    enabled: !!company,
  });
}

export function useBankAccountCount(company: string, search: string) {
  return useQuery({
    queryKey: queryKeys.bankAccounts.count(company, search),
    queryFn: () => {
      const filters: unknown[] = [
        ["account_type", "=", "Bank"],
        ["is_group", "=", 0],
        ["company", "=", company],
      ];
      if (search) filters.push(["account_name", "like", `%${search}%`]);
      return frappe.getCount("Account", filters);
    },
    enabled: !!company,
  });
}

export function useBankAccountDetail(name: string) {
  return useQuery({
    queryKey: queryKeys.bankAccounts.detail(name),
    queryFn: async () => {
      const [doc, balance] = await Promise.all([
        frappe.getDoc<AccountDetail>("Account", name),
        frappe
          .call<number>("erpnext.accounts.utils.get_balance_on", {
            account: name,
            date: getToday(),
          })
          .catch(() => 0),
      ]);
      return { ...doc, balance };
    },
    enabled: !!name,
  });
}

// --- GL Entry Queries ---

export function useGLEntries(account: string, page: number, sort: string) {
  return useQuery({
    queryKey: queryKeys.glEntries.list(account, page, sort),
    queryFn: () =>
      frappe.getList<GLEntry>("GL Entry", {
        filters: [["account", "=", account]],
        fields: [
          "name",
          "posting_date",
          "voucher_type",
          "voucher_no",
          "debit_in_account_currency",
          "credit_in_account_currency",
        ],
        orderBy: sort || "posting_date desc",
        limitPageLength: GL_PAGE_SIZE,
        limitStart: (page - 1) * GL_PAGE_SIZE,
      }),
    enabled: !!account,
  });
}

export function useGLEntryCount(account: string) {
  return useQuery({
    queryKey: queryKeys.glEntries.count(account),
    queryFn: () => frappe.getCount("GL Entry", [["account", "=", account]]),
    enabled: !!account,
  });
}

// --- COA Queries ---

export function useCOAAccounts(
  company: string,
  page: number,
  search: string,
  sort: string,
  showGroups: boolean,
) {
  return useQuery({
    queryKey: queryKeys.coaAccounts.list(company, page, search, sort, showGroups),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (!showGroups) filters.push(["is_group", "=", 0]);
      if (search) filters.push(["account_name", "like", `%${search}%`]);
      return frappe.getList<COAAccountListItem>("Account", {
        filters,
        fields: [
          "name",
          "account_name",
          "account_type",
          "account_currency",
          "parent_account",
          "is_group",
          "root_type",
        ],
        orderBy: sort || "account_name asc",
        limitPageLength: PAGE_SIZE,
        limitStart: (page - 1) * PAGE_SIZE,
      });
    },
    enabled: !!company,
  });
}

export function useCOACount(company: string, search: string, showGroups: boolean) {
  return useQuery({
    queryKey: queryKeys.coaAccounts.count(company, search, showGroups),
    queryFn: () => {
      const filters: unknown[] = [["company", "=", company]];
      if (!showGroups) filters.push(["is_group", "=", 0]);
      if (search) filters.push(["account_name", "like", `%${search}%`]);
      return frappe.getCount("Account", filters);
    },
    enabled: !!company,
  });
}

export interface COATreeNode {
  account: COAAccountListItem;
  children: COATreeNode[];
}

export function useCOATree(company: string, companyCurrency: string) {
  return useQuery({
    queryKey: queryKeys.coaAccounts.tree(company),
    queryFn: async () => {
      const accounts = await frappe.getList<COAAccountListItem>("Account", {
        filters: [["company", "=", company]],
        fields: [
          "name",
          "account_name",
          "account_type",
          "account_currency",
          "parent_account",
          "is_group",
          "root_type",
        ],
        orderBy: "lft asc",
        limitPageLength: 0,
      });

      const leafAccounts = accounts.filter((a) => !a.is_group);

      // Batch fetch all leaf account balances in 1 RPC call instead of N
      const balanceMap = await fetchBalancesBatch(
        leafAccounts.map((a) => a.name),
        getToday(),
      );

      const enriched = accounts.map((acc) => {
        const b = balanceMap.get(acc.name);
        return b ? { ...acc, balance: b.balance, balance_in_base_currency: b.baseBalance } : acc;
      });

      return buildTree(enriched);
    },
    enabled: !!company && !!companyCurrency,
    staleTime: 5 * 60 * 1000,
  });
}

function buildTree(accounts: COAAccountListItem[]): COATreeNode[] {
  const byName = new Map<string, COATreeNode>();
  const roots: COATreeNode[] = [];

  for (const acc of accounts) {
    byName.set(acc.name, { account: acc, children: [] });
  }

  for (const acc of accounts) {
    const node = byName.get(acc.name)!;
    if (acc.parent_account && byName.has(acc.parent_account)) {
      byName.get(acc.parent_account)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function useGroupAccounts(company: string) {
  return useQuery({
    queryKey: queryKeys.groupAccounts(company),
    queryFn: () =>
      frappe.getList<{ name: string; account_name: string }>("Account", {
        filters: [
          ["is_group", "=", 1],
          ["company", "=", company],
          ["disabled", "=", 0],
        ],
        fields: ["name", "account_name"],
        orderBy: "account_name asc",
        limitPageLength: 500,
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEquityAccounts(company: string) {
  return useQuery({
    queryKey: queryKeys.equityAccounts(company),
    queryFn: () =>
      frappe.getList<{ name: string; account_name: string }>("Account", {
        filters: [
          ["root_type", "=", "Equity"],
          ["is_group", "=", 0],
          ["company", "=", company],
          ["disabled", "=", 0],
        ],
        fields: ["name", "account_name"],
        orderBy: "account_name asc",
        limitPageLength: 100,
      }),
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: queryKeys.currencies,
    queryFn: () =>
      frappe.getList<Currency>("Currency", {
        filters: [["enabled", "=", 1]],
        fields: ["name", "symbol", "symbol_on_right"],
        orderBy: "name asc",
        limitPageLength: 500,
      }),
    staleTime: Infinity,
  });
}

export type CurrencyInfo = { symbol: string; onRight: boolean };

export function useCurrencyMap() {
  return useQuery({
    queryKey: queryKeys.currencies,
    queryFn: () =>
      frappe.getList<Currency>("Currency", {
        filters: [["enabled", "=", 1]],
        fields: ["name", "symbol", "symbol_on_right"],
        orderBy: "name asc",
        limitPageLength: 500,
      }),
    select: (data) =>
      new Map<string, CurrencyInfo>(
        data.map((c) => [c.name, { symbol: c.symbol, onRight: !!c.symbol_on_right }]),
      ),
    staleTime: Infinity,
  });
}

export function useAccountDetail(name: string | undefined) {
  return useQuery({
    queryKey: ["accountDetail", name],
    queryFn: () => frappe.getDoc<AccountDetail>("Account", name!),
    enabled: !!name,
  });
}

// --- Ledger Queries ---

const LEDGER_PAGE_SIZE = 50;

export function useAccountWithBalance(name: string, companyCurrency: string) {
  return useQuery({
    queryKey: queryKeys.ledger.accountDetail(name),
    queryFn: async () => {
      const [doc, balance, baseBalance] = await Promise.all([
        frappe.getDoc<AccountDetail>("Account", name),
        frappe
          .call<number>("erpnext.accounts.utils.get_balance_on", {
            account: name,
            date: getToday(),
          })
          .catch(() => 0),
        frappe
          .call<number>("erpnext.accounts.utils.get_balance_on", {
            account: name,
            date: getToday(),
            in_account_currency: false,
          })
          .catch(() => 0),
      ]);
      return { ...doc, balance, baseBalance };
    },
    enabled: !!name && !!companyCurrency,
  });
}

export function useLedgerEntries(
  account: string,
  page: number,
  sort: string,
  fromDate?: string,
  toDate?: string,
) {
  return useQuery({
    queryKey: queryKeys.ledger.entries(account, page, sort, fromDate, toDate),
    queryFn: () => {
      const filters: unknown[] = [["account", "=", account]];
      if (fromDate) filters.push(["posting_date", ">=", fromDate]);
      if (toDate) filters.push(["posting_date", "<=", toDate]);

      return frappe.getList<LedgerEntry>("GL Entry", {
        filters,
        fields: [
          "name",
          "posting_date",
          "creation",
          "voucher_type",
          "voucher_no",
          "remarks",
          "debit_in_account_currency",
          "credit_in_account_currency",
          "debit",
          "credit",
          "account_currency",
        ],
        orderBy: sort || "posting_date desc",
        limitPageLength: LEDGER_PAGE_SIZE,
        limitStart: (page - 1) * LEDGER_PAGE_SIZE,
      });
    },
    enabled: !!account,
  });
}

export function useLedgerEntryCount(account: string, fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: queryKeys.ledger.count(account, fromDate, toDate),
    queryFn: () => {
      const filters: unknown[] = [["account", "=", account]];
      if (fromDate) filters.push(["posting_date", ">=", fromDate]);
      if (toDate) filters.push(["posting_date", "<=", toDate]);
      return frappe.getCount("GL Entry", filters);
    },
    enabled: !!account,
  });
}

export function useCurrentExchangeRate(fromCurrency: string, toCurrency: string) {
  const erpnextRate = useQuery({
    queryKey: queryKeys.ledger.exchangeRate(fromCurrency, toCurrency),
    queryFn: () =>
      frappe.call<number>("erpnext.setup.utils.get_exchange_rate", {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        transaction_date: getToday(),
      }),
    enabled: !!fromCurrency && !!toCurrency && fromCurrency !== toCurrency,
    staleTime: 10 * 60 * 1000,
  });

  const { data: cbuRates } = useCBURates();
  const { currencyCode: companyCurrency } = useCompanyStore();

  const rate = useMemo(() => {
    if (erpnextRate.data && erpnextRate.data > 0) return erpnextRate.data;
    if (!cbuRates) return 0;

    // CBU rates are always X UZS per 1 foreign unit
    if (toCurrency === companyCurrency) return cbuRates.get(fromCurrency) ?? 0;
    if (fromCurrency === companyCurrency) {
      const r = cbuRates.get(toCurrency);
      return r ? 1 / r : 0;
    }
    // Cross-rate via UZS
    const fromRate = cbuRates.get(fromCurrency);
    const toRate = cbuRates.get(toCurrency);
    return fromRate && toRate ? fromRate / toRate : 0;
  }, [erpnextRate.data, cbuRates, fromCurrency, toCurrency, companyCurrency]);

  return { data: rate, isLoading: erpnextRate.isLoading };
}

// --- Account Mutations ---

function insertNodeInTree(
  tree: COATreeNode[],
  parentName: string,
  node: COATreeNode,
): COATreeNode[] {
  return tree.map((n) => {
    if (n.account.name === parentName) {
      return { ...n, children: [...n.children, node] };
    }
    if (n.children.length) {
      return { ...n, children: insertNodeInTree(n.children, parentName, node) };
    }
    return n;
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      mode,
      company,
    }: {
      data: BankAccountFormValues | GeneralAccountFormValues;
      mode: "bank" | "general";
      company: string;
    }) => {
      const payload: Record<string, unknown> = {
        doctype: "Account",
        ...data,
        company,
        is_group: "is_group" in data ? (data.is_group ? 1 : 0) : 0,
      };
      if (mode === "bank") {
        payload.account_type = "Bank";
        payload.root_type = "Asset";
        payload.report_type = "Balance Sheet";
      }
      return frappe.createDoc<AccountDetail>("Account", payload);
    },
    onSuccess: (created, { data, company }) => {
      // Optimistically insert the new account into the cached COA tree
      const treeKey = queryKeys.coaAccounts.tree(company);
      qc.setQueryData<COATreeNode[]>(treeKey, (old) => {
        if (!old) return old;
        const newNode: COATreeNode = {
          account: {
            name: created.name,
            account_name: created.account_name,
            account_type: created.account_type,
            account_currency: created.account_currency,
            parent_account: data.parent_account,
            is_group: created.is_group,
            root_type: created.root_type,
            balance: 0,
            balance_in_base_currency: 0,
          },
          children: [],
        };
        return insertNodeInTree(old, data.parent_account, newNode);
      });

      // Background refetch for accurate balances
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["coaAccounts"] });
      qc.invalidateQueries({ queryKey: ["groupAccounts"] });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      data,
    }: {
      name: string;
      data: Partial<BankAccountFormValues | GeneralAccountFormValues>;
    }) => {
      const doc = await frappe.getDoc<AccountDetail>("Account", name);
      const updates: Record<string, unknown> = { ...data };
      if ("is_group" in data && typeof data.is_group === "boolean") {
        updates.is_group = data.is_group ? 1 : 0;
      }
      return frappe.save<AccountDetail>({
        ...(doc as unknown as Record<string, unknown>),
        ...updates,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      qc.invalidateQueries({ queryKey: ["coaAccounts"] });
      qc.invalidateQueries({ queryKey: ["groupAccounts"] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => frappe.deleteDoc("Account", name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      qc.invalidateQueries({ queryKey: ["coaAccounts"] });
      qc.invalidateQueries({ queryKey: ["groupAccounts"] });
    },
  });
}

export function useCreateOpeningBalanceJE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      targetAccount,
      account,
      equityAccount,
      amount,
      date,
      memo,
      exchangeRate,
      baseAmount,
      company,
      companyCurrency,
    }: {
      targetAccount: string;
      account: { root_type: string; account_currency: string };
      equityAccount: string;
      amount: number;
      date: string;
      memo?: string;
      exchangeRate: number;
      baseAmount?: number;
      company: string;
      companyCurrency: string;
    }) => {
      const isDebitNormal = ["Asset", "Expense"].includes(account.root_type);

      // Golden rule: use user-provided base amount when available, derive rate from amounts
      const equityAmount = baseAmount ?? Math.round(amount * exchangeRate * 100) / 100;
      const adjustedRate =
        account.account_currency !== companyCurrency && equityAmount > 0 && amount > 0
          ? equityAmount / amount
          : exchangeRate;

      const accounts = [
        {
          account: targetAccount,
          debit_in_account_currency: isDebitNormal ? amount : 0,
          credit_in_account_currency: isDebitNormal ? 0 : amount,
          exchange_rate: adjustedRate,
          account_currency: account.account_currency,
        },
        {
          account: equityAccount,
          debit_in_account_currency: isDebitNormal ? 0 : equityAmount,
          credit_in_account_currency: isDebitNormal ? equityAmount : 0,
          exchange_rate: 1,
          account_currency: companyCurrency,
        },
      ];

      const je = await frappe.createDoc<{ name: string }>("Journal Entry", {
        doctype: "Journal Entry",
        company,
        posting_date: date,
        voucher_type: "Opening Entry",
        multi_currency: account.account_currency !== companyCurrency ? 1 : 0,
        user_remark: memo || "Opening Balance",
        accounts,
      });
      await frappe.submitWithRetry("Journal Entry", je.name);
      return je as { name: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["glEntries"] });
      qc.invalidateQueries({ queryKey: ["coaAccounts"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
    },
  });
}
