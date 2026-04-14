import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { ensureMultiCurrencyEnabled, fetchExchangeRate } from "@/lib/multi-currency";
import { queryKeys } from "@/hooks/query-keys";
import type { JournalEntry } from "@/types/journal-entry";
import type { EmployeeListItem } from "@/types/employee";

// ---------------------------------------------------------------------------
// Active employees with salary
// ---------------------------------------------------------------------------

export function useActiveEmployeesWithSalary(company: string) {
  return useQuery({
    queryKey: queryKeys.salary.employees(company),
    queryFn: () =>
      frappe.getList<EmployeeListItem>("Employee", {
        filters: [
          ["company", "=", company],
          ["status", "=", "Active"],
        ],
        fields: ["name", "employee_name", "designation", "department", "status"],
        orderBy: "employee_name asc",
        limitPageLength: 500,
      }),
    enabled: !!company,
  });
}

// ---------------------------------------------------------------------------
// Accrual duplicate check — per-employee detection
// ---------------------------------------------------------------------------

export interface SalaryAccrualJE {
  name: string;
  posting_date: string;
  total_debit: number;
  docstatus: 0 | 1 | 2;
  employees: Array<{ party: string; amount: number }>;
}

export interface AccrualCheckResult {
  accrualJEs: SalaryAccrualJE[];
  /** Map from employee ID → { jeName, amount } — only from submitted JEs */
  accruedEmployees: Map<string, { jeName: string; amount: number }>;
}

export function useSalaryAccrualCheck(company: string, month: string) {
  return useQuery({
    queryKey: queryKeys.salary.accrualCheck(company, month),
    queryFn: async (): Promise<AccrualCheckResult> => {
      const tag = `[SALARY-ACCRUAL:${month}]`;
      const results = await frappe.getList<{
        name: string;
        posting_date: string;
        total_debit: number;
        docstatus: 0 | 1 | 2;
      }>("Journal Entry", {
        filters: [
          ["company", "=", company],
          ["user_remark", "like", `%${tag}%`],
        ],
        fields: ["name", "posting_date", "total_debit", "docstatus"],
        orderBy: "posting_date desc",
        limitPageLength: 100,
      });

      // Fetch accounts child rows for each JE to extract employee lines
      const accrualJEs: SalaryAccrualJE[] = await Promise.all(
        results.map(async (je) => {
          const fullDoc = await frappe.getDoc<JournalEntry>("Journal Entry", je.name);
          const employees = (fullDoc.accounts ?? [])
            .filter(
              (acc) =>
                acc.party_type === "Employee" &&
                acc.party &&
                (acc.credit_in_account_currency ?? 0) > 0,
            )
            .map((acc) => ({
              party: acc.party!,
              amount: acc.credit_in_account_currency ?? 0,
            }));
          return { ...je, employees };
        }),
      );

      // Build per-employee map from submitted JEs only
      const accruedEmployees = new Map<string, { jeName: string; amount: number }>();
      for (const je of accrualJEs) {
        if (je.docstatus !== 1) continue;
        for (const emp of je.employees) {
          accruedEmployees.set(emp.party, {
            jeName: je.name,
            amount: emp.amount,
          });
        }
      }

      return { accrualJEs, accruedEmployees };
    },
    enabled: !!company && !!month,
  });
}

// ---------------------------------------------------------------------------
// Salary accrual CRUD mutations
// ---------------------------------------------------------------------------

function salaryInvalidationKeys() {
  return [["salary"], ["journalEntries"], ["partyBalances"], ["partyLedger"], ["dashboard"]];
}

export function useCancelSalaryAccrual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      await frappe.cancel("Journal Entry", name);
    },
    onSuccess: () => {
      for (const key of salaryInvalidationKeys()) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useDeleteSalaryAccrual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      await frappe.deleteDoc("Journal Entry", name);
    },
    onSuccess: () => {
      for (const key of salaryInvalidationKeys()) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useSubmitSalaryAccrual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const fullDoc = await frappe.getDoc<JournalEntry>("Journal Entry", name);
      await frappe.submit<JournalEntry>(fullDoc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      for (const key of salaryInvalidationKeys()) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Accrue salary (create + submit JE)
// ---------------------------------------------------------------------------

interface AccrueSalaryParams {
  postingDate: string;
  month: string;
  company: string;
  salaryPayableAccount: string;
  payableCurrency: string;
  payableExchangeRate: number; // 1 payableCcy = X companyCcy
  /** Per-expense-account exchange rates: account → rate */
  expenseExchangeRates: Map<string, number>;
  /** Per-expense-account currencies: account → currency */
  expenseCurrencies: Map<string, string>;
  employees: Array<{
    name: string;
    employee_name: string;
    amount: number; // in payable account currency
    expenseAccount: string;
  }>;
}

export function useAccrueSalary() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: AccrueSalaryParams) => {
      const companyDoc = await frappe.getDoc<{ default_currency: string }>("Company", p.company);
      const companyCurrency = companyDoc.default_currency;

      // Collect all unique currencies involved
      const allCurrencies = new Set([p.payableCurrency, companyCurrency]);
      for (const cur of p.expenseCurrencies.values()) allCurrencies.add(cur);
      const isMultiCurrency = allCurrencies.size > 1;

      if (isMultiCurrency) {
        await ensureMultiCurrencyEnabled(p.company, [...allCurrencies]);
      }

      const monthLabel = p.month.replace("-", "/");
      const userRemark = `Salary accrual ${monthLabel} [SALARY-ACCRUAL:${p.month}]`;

      // Group employee amounts by expense account
      const expenseGroups = new Map<string, number>();
      for (const emp of p.employees) {
        expenseGroups.set(
          emp.expenseAccount,
          (expenseGroups.get(emp.expenseAccount) ?? 0) + emp.amount,
        );
      }

      // Debit lines: one per unique expense account
      // Amount is in payable currency → convert to expense account currency if different
      // Golden rule: compute a base amount first, then derive expense amount + adjusted rate
      // so that expenseAmount × adjustedRate === baseAmount exactly.
      const debitLines = [...expenseGroups.entries()].map(([account, payableTotal]) => {
        const expCurrency = p.expenseCurrencies.get(account) ?? companyCurrency;
        const expRate = p.expenseExchangeRates.get(account) ?? 1;
        const payRate = p.payableExchangeRate;

        let expenseAmount: number;
        let adjustedRate: number;
        if (expCurrency === p.payableCurrency) {
          expenseAmount = payableTotal;
          adjustedRate = expRate;
        } else {
          // Anchor: base amount from credit side
          const baseAmount = Math.round(payableTotal * payRate * 100) / 100;
          expenseAmount =
            expRate > 0 ? Math.round((baseAmount / expRate) * 100) / 100 : payableTotal;
          // Adjust rate so expenseAmount × adjustedRate = baseAmount exactly
          adjustedRate = expenseAmount > 0 ? baseAmount / expenseAmount : expRate;
        }

        return {
          doctype: "Journal Entry Account" as const,
          account,
          account_currency: expCurrency,
          debit_in_account_currency: expenseAmount,
          exchange_rate: adjustedRate,
        };
      });

      // Credit lines: one per employee
      const creditLines = p.employees.map((emp) => ({
        doctype: "Journal Entry Account" as const,
        account: p.salaryPayableAccount,
        account_currency: p.payableCurrency,
        party_type: "Employee" as const,
        party: emp.name,
        credit_in_account_currency: emp.amount,
        exchange_rate: p.payableExchangeRate,
      }));

      const accounts = [...debitLines, ...creditLines];

      const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: p.postingDate,
        company: p.company,
        user_remark: userRemark,
        multi_currency: isMultiCurrency ? 1 : 0,
        accounts,
      });

      const fullDoc = await frappe.getDoc<JournalEntry>("Journal Entry", created.name);
      await frappe.submit<JournalEntry>(fullDoc as unknown as Record<string, unknown>);

      return { name: created.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}


// ---------------------------------------------------------------------------
// Pay salary (create + submit JE)
// ---------------------------------------------------------------------------

interface PaySalaryParams {
  postingDate: string;
  company: string;
  employee: string;
  employeeName: string;
  bankAmount: number; // sacred user input in bank currency
  payableAmount: number; // sacred user input in payable currency
  bankCurrency: string;
  payableCurrency: string;
  salaryPayableAccount: string;
  bankAccount: string;
  description?: string;
}

export function usePaySalary() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: PaySalaryParams) => {
      // Defensive: verify actual account currencies from ERPNext master data
      // (caller may pass stale/empty values if the query hadn't resolved yet)
      const [payableAccDoc, bankAccDoc] = await Promise.all([
        frappe.getDoc<{ account_currency: string }>("Account", p.salaryPayableAccount),
        frappe.getDoc<{ account_currency: string }>("Account", p.bankAccount),
      ]);
      const payableCurrency = payableAccDoc.account_currency;
      const bankCurrency = bankAccDoc.account_currency;

      const isMultiCurrency = bankCurrency !== payableCurrency;
      if (isMultiCurrency) {
        await ensureMultiCurrencyEnabled(p.company, [payableCurrency, bankCurrency]);
      }

      // Golden rule: both amounts are sacred. Derive exchange rates from amounts.
      // ERPNext convention: exchange_rate = "1 account_currency = X company_currency"
      // ERPNext computes base = amount_in_account_currency × exchange_rate
      // Both sides must produce the SAME base amount.
      const companyDoc = await frappe.getDoc<{ default_currency: string }>("Company", p.company);
      const companyCurrency = companyDoc.default_currency;

      let bankRate: number;
      let payableRate: number;

      if (bankCurrency === payableCurrency) {
        // Same currency — no conversion
        bankRate = bankCurrency === companyCurrency ? 1 : (await fetchExchangeRate(bankCurrency, companyCurrency, p.postingDate)) ?? 1;
        payableRate = bankRate;
      } else if (bankCurrency === companyCurrency) {
        // Bank is in company currency (e.g. UZS), payable is foreign (e.g. USD)
        // base = bankAmount (already in company currency)
        bankRate = 1;
        payableRate = p.bankAmount / p.payableAmount;
      } else if (payableCurrency === companyCurrency) {
        // Payable is in company currency, bank is foreign
        payableRate = 1;
        bankRate = p.payableAmount / p.bankAmount;
      } else {
        // Neither is company currency — anchor to bank side via fetched rate
        const fetchedBankRate = (await fetchExchangeRate(bankCurrency, companyCurrency, p.postingDate)) ?? 1;
        const companyAmount = p.bankAmount * fetchedBankRate;
        bankRate = fetchedBankRate;
        payableRate = companyAmount / p.payableAmount;
      }

      const userRemark = p.description
        ? `${p.description} — Salary payment to ${p.employeeName} [SALARY-PAY]`
        : `Salary payment to ${p.employeeName} [SALARY-PAY]`;

      const accounts = [
        {
          doctype: "Journal Entry Account" as const,
          account: p.salaryPayableAccount,
          party_type: "Employee" as const,
          party: p.employee,
          account_currency: payableCurrency,
          debit_in_account_currency: p.payableAmount,
          exchange_rate: payableRate,
        },
        {
          doctype: "Journal Entry Account" as const,
          account: p.bankAccount,
          account_currency: bankCurrency,
          credit_in_account_currency: p.bankAmount,
          exchange_rate: bankRate,
        },
      ];

      const created = await frappe.createDoc<JournalEntry>("Journal Entry", {
        doctype: "Journal Entry",
        voucher_type: "Journal Entry",
        naming_series: "ACC-JV-.YYYY.-",
        posting_date: p.postingDate,
        company: p.company,
        user_remark: userRemark,
        multi_currency: isMultiCurrency ? 1 : 0,
        accounts,
      });

      const fullDoc = await frappe.getDoc<JournalEntry>("Journal Entry", created.name);
      await frappe.submit<JournalEntry>(fullDoc as unknown as Record<string, unknown>);

      return { name: created.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journalEntries"] });
      qc.invalidateQueries({ queryKey: ["partyBalances"] });
      qc.invalidateQueries({ queryKey: ["partyLedger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}
