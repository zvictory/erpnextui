import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { enrichJEAccounts, ensureMultiCurrencyEnabled } from "@/lib/multi-currency";
import type { JournalEntryAccount } from "@/types/journal-entry";
import type { Partner, PartnerInvoice } from "@/types/partner";

// ── Partners list ──────────────────────────────────────────

export function usePartnersList(company: string) {
  return useQuery({
    queryKey: ["partners", company],
    queryFn: async (): Promise<Partner[]> => {
      // Get customers that have a linked supplier
      const customers = await frappe.getList<{
        name: string;
        customer_name: string;
        tax_id: string;
        default_currency: string;
        custom_linked_supplier: string;
      }>("Customer", {
        filters: [["custom_linked_supplier", "is", "set"]],
        fields: ["name", "customer_name", "tax_id", "default_currency", "custom_linked_supplier"],
        limitPageLength: 0,
      });

      // Fetch balances for each pair in parallel
      const partners = await Promise.all(
        customers.map(async (c) => {
          const [receivable, payable] = await Promise.all([
            frappe
              .call<number>("erpnext.accounts.utils.get_balance_on", {
                party_type: "Customer",
                party: c.name,
                company,
              })
              .catch(() => 0),
            frappe
              .call<number>("erpnext.accounts.utils.get_balance_on", {
                party_type: "Supplier",
                party: c.custom_linked_supplier,
                company,
              })
              .catch(() => 0),
          ]);

          const recv = Math.abs(receivable || 0);
          const pay = Math.abs(payable || 0);
          const net = recv - pay;

          return {
            id: c.name,
            companyName: c.customer_name,
            taxId: c.tax_id || null,
            customerId: c.name,
            supplierId: c.custom_linked_supplier,
            currency: c.default_currency || "UZS",
            receivable: recv,
            payable: pay,
            netBalance: Math.abs(net),
            netDirection: (net > 0
              ? "they_pay"
              : net < 0
                ? "we_pay"
                : "settled") as Partner["netDirection"],
          };
        }),
      );

      return partners;
    },
    enabled: !!company,
  });
}

// ── Partner detail ─────────────────────────────────────────

export function usePartnerDetail(customerId: string, company: string) {
  return useQuery({
    queryKey: ["partner-detail", customerId, company],
    queryFn: async () => {
      const customer = await frappe.getDoc<{
        name: string;
        customer_name: string;
        tax_id: string;
        default_currency: string;
        custom_linked_supplier: string;
      }>("Customer", customerId);

      const supplierId = customer.custom_linked_supplier;
      if (!supplierId) throw new Error("This customer is not a partner");

      const [receivable, payable] = await Promise.all([
        frappe
          .call<number>("erpnext.accounts.utils.get_balance_on", {
            party_type: "Customer",
            party: customerId,
            company,
          })
          .catch(() => 0),
        frappe
          .call<number>("erpnext.accounts.utils.get_balance_on", {
            party_type: "Supplier",
            party: supplierId,
            company,
          })
          .catch(() => 0),
      ]);

      return {
        customer,
        supplierId,
        receivable: Math.abs(receivable || 0),
        payable: Math.abs(payable || 0),
      };
    },
    enabled: !!customerId && !!company,
  });
}

// ── Unpaid invoices ────────────────────────────────────────

export function useUnpaidSalesInvoices(customerId: string) {
  return useQuery({
    queryKey: ["unpaid-sinv", customerId],
    queryFn: () =>
      frappe.getList<PartnerInvoice>("Sales Invoice", {
        filters: [
          ["customer", "=", customerId],
          ["outstanding_amount", ">", 0],
          ["docstatus", "=", 1],
        ],
        fields: [
          "name",
          "posting_date",
          "grand_total",
          "outstanding_amount",
          "paid_amount",
          "currency",
        ],
        orderBy: "posting_date desc",
        limitPageLength: 100,
      }),
    enabled: !!customerId,
  });
}

export function useUnpaidPurchaseInvoices(supplierId: string) {
  return useQuery({
    queryKey: ["unpaid-pinv", supplierId],
    queryFn: () =>
      frappe.getList<PartnerInvoice>("Purchase Invoice", {
        filters: [
          ["supplier", "=", supplierId],
          ["outstanding_amount", ">", 0],
          ["docstatus", "=", 1],
        ],
        fields: [
          "name",
          "posting_date",
          "grand_total",
          "outstanding_amount",
          "paid_amount",
          "currency",
        ],
        orderBy: "posting_date desc",
        limitPageLength: 100,
      }),
    enabled: !!supplierId,
  });
}

// ── Payment history ────────────────────────────────────────

export function usePaymentHistory(customerId: string, supplierId: string) {
  return useQuery({
    queryKey: ["payment-history", customerId, supplierId],
    queryFn: async () => {
      const [payments, journals] = await Promise.all([
        frappe.getList<{
          name: string;
          posting_date: string;
          payment_type: string;
          party_type: string;
          party: string;
          paid_amount: number;
          reference_no: string;
        }>("Payment Entry", {
          filters: [
            ["party", "in", [customerId, supplierId]],
            ["docstatus", "=", 1],
          ],
          fields: [
            "name",
            "posting_date",
            "payment_type",
            "party_type",
            "party",
            "paid_amount",
            "reference_no",
          ],
          orderBy: "posting_date desc",
          limitPageLength: 50,
        }),
        frappe.getList<{
          name: string;
          posting_date: string;
          total_debit: number;
          user_remark: string;
        }>("Journal Entry", {
          filters: [
            ["docstatus", "=", 1],
            ["user_remark", "like", `%offset%${customerId}%`],
          ],
          fields: ["name", "posting_date", "total_debit", "user_remark"],
          orderBy: "posting_date desc",
          limitPageLength: 50,
        }),
      ]);
      return { payments, journals };
    },
    enabled: !!customerId && !!supplierId,
  });
}

// ── Create offset (Journal Entry) ──────────────────────────

export function useCreateOffset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      customerId: string;
      supplierId: string;
      company: string;
      companyAbbr: string;
      offsetAmount: number;
      salesInvoices: { name: string; amount: number }[];
      purchaseInvoices: { name: string; amount: number }[];
      postingDate: string;
      remark?: string;
    }) => {
      const rawAccounts: JournalEntryAccount[] = [];

      // Debit Creditors — reduces payable
      let remainingDebit = params.offsetAmount;
      for (const pi of params.purchaseInvoices) {
        const amount = Math.min(pi.amount, remainingDebit);
        if (amount <= 0) continue;
        rawAccounts.push({
          doctype: "Journal Entry Account",
          account: `Creditors - ${params.companyAbbr}`,
          party_type: "Supplier",
          party: params.supplierId,
          debit_in_account_currency: amount,
          reference_type: "Purchase Invoice",
          reference_name: pi.name,
        });
        remainingDebit -= amount;
      }

      // Credit Debtors — reduces receivable
      let remainingCredit = params.offsetAmount;
      for (const si of params.salesInvoices) {
        const amount = Math.min(si.amount, remainingCredit);
        if (amount <= 0) continue;
        rawAccounts.push({
          doctype: "Journal Entry Account",
          account: `Debtors - ${params.companyAbbr}`,
          party_type: "Customer",
          party: params.customerId,
          credit_in_account_currency: amount,
          reference_type: "Sales Invoice",
          reference_name: si.name,
        });
        remainingCredit -= amount;
      }

      // Enrich accounts with currency + exchange rates
      const companyDoc = await frappe.getDoc<{ default_currency: string }>(
        "Company",
        params.company,
      );
      const companyCurrency = companyDoc.default_currency;
      const { accounts, isMultiCurrency } = await enrichJEAccounts(rawAccounts, companyCurrency, {
        date: params.postingDate,
      });

      if (isMultiCurrency) {
        await ensureMultiCurrencyEnabled(params.company, [
          ...new Set(accounts.map((a) => a.account_currency).filter(Boolean) as string[]),
        ]);
      }

      const journalEntry = {
        doctype: "Journal Entry",
        posting_date: params.postingDate,
        company: params.company,
        voucher_type: "Journal Entry",
        multi_currency: isMultiCurrency ? 1 : 0,
        accounts,
        user_remark:
          params.remark ||
          `O'zaro hisob-kitob (offset): ${params.customerId} ↔ ${params.supplierId}. Summa: ${params.offsetAmount}`,
      };

      // Create and submit
      const created = await frappe.createDoc<{ name: string }>("Journal Entry", journalEntry);
      await frappe.submitWithRetry("Journal Entry", created.name);

      return created;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-detail", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["unpaid-sinv", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["unpaid-pinv", vars.supplierId] });
      qc.invalidateQueries({ queryKey: ["payment-history"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
  });
}

// ── Link / Unlink partner ──────────────────────────────────

export function useLinkPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { customerId: string; supplierId: string }) => {
      await frappe.updateDoc("Customer", params.customerId, {
        custom_linked_supplier: params.supplierId,
      });
      await frappe.updateDoc("Supplier", params.supplierId, {
        custom_linked_customer: params.customerId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUnlinkPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { customerId: string; supplierId: string }) => {
      await frappe.updateDoc("Customer", params.customerId, {
        custom_linked_supplier: "",
      });
      await frappe.updateDoc("Supplier", params.supplierId, {
        custom_linked_customer: "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

// ── Search by tax ID ───────────────────────────────────────

export function useSearchByTaxId(taxId: string) {
  return useQuery({
    queryKey: ["search-tax-id", taxId],
    queryFn: async () => {
      const [customers, suppliers] = await Promise.all([
        frappe.getList<{ name: string; customer_name: string; tax_id: string }>("Customer", {
          filters: [["tax_id", "=", taxId]],
          fields: ["name", "customer_name", "tax_id"],
        }),
        frappe.getList<{ name: string; supplier_name: string; tax_id: string }>("Supplier", {
          filters: [["tax_id", "=", taxId]],
          fields: ["name", "supplier_name", "tax_id"],
        }),
      ]);
      return {
        customer: customers[0] || null,
        supplier: suppliers[0] || null,
      };
    },
    enabled: taxId.length >= 5,
  });
}
