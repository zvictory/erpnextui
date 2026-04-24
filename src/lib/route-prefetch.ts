import type { QueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";
import type { SalesInvoiceListItem } from "@/types/sales-invoice";

const LIST_PAGE_SIZE = 20;
const STALE_TIME = 30_000;

type Prefetcher = (qc: QueryClient, company: string) => void;

function prefetchList(
  qc: QueryClient,
  queryKey: readonly unknown[],
  fetcher: () => Promise<unknown>,
) {
  qc.prefetchQuery({ queryKey, queryFn: fetcher, staleTime: STALE_TIME });
}

function prefetchCount(
  qc: QueryClient,
  queryKey: readonly unknown[],
  fetcher: () => Promise<unknown>,
) {
  qc.prefetchQuery({ queryKey, queryFn: fetcher, staleTime: STALE_TIME });
}

const salesInvoices: Prefetcher = (qc, company) => {
  if (!company) return;
  const sort = "posting_date desc,creation desc";
  const filters = [["company", "=", company]];
  prefetchList(
    qc,
    [...queryKeys.salesInvoices.list(company, 1, "", sort), undefined],
    () =>
      frappe.getList<SalesInvoiceListItem>("Sales Invoice", {
        filters,
        fields: [
          "name",
          "customer",
          "customer_name",
          "posting_date",
          "grand_total",
          "currency",
          "status",
          "docstatus",
          "is_return",
        ],
        orderBy: sort,
        limitPageLength: LIST_PAGE_SIZE,
        limitStart: 0,
      }),
  );
  prefetchCount(qc, [...queryKeys.salesInvoices.count(company, ""), undefined], () =>
    frappe.getCount("Sales Invoice", filters),
  );
};

const purchaseInvoices: Prefetcher = (qc, company) => {
  if (!company) return;
  const sort = "posting_date desc,creation desc";
  const filters = [["company", "=", company]];
  prefetchList(
    qc,
    [...queryKeys.purchaseInvoices.list(company, 1, "", sort), undefined],
    () =>
      frappe.getList("Purchase Invoice", {
        filters,
        fields: [
          "name",
          "supplier",
          "supplier_name",
          "posting_date",
          "grand_total",
          "currency",
          "status",
          "docstatus",
        ],
        orderBy: sort,
        limitPageLength: LIST_PAGE_SIZE,
        limitStart: 0,
      }),
  );
  prefetchCount(qc, [...queryKeys.purchaseInvoices.count(company, ""), undefined], () =>
    frappe.getCount("Purchase Invoice", filters),
  );
};

const payments: Prefetcher = (qc, company) => {
  if (!company) return;
  const sort = "posting_date desc,creation desc";
  const filters = [["company", "=", company]];
  prefetchList(
    qc,
    [...queryKeys.paymentEntries.list(company, 1, "", sort), undefined],
    () =>
      frappe.getList("Payment Entry", {
        filters,
        fields: [
          "name",
          "payment_type",
          "party_type",
          "party",
          "party_name",
          "posting_date",
          "paid_amount",
          "paid_from_account_currency",
          "paid_to_account_currency",
          "status",
          "docstatus",
        ],
        orderBy: sort,
        limitPageLength: LIST_PAGE_SIZE,
        limitStart: 0,
      }),
  );
  prefetchCount(qc, [...queryKeys.paymentEntries.count(company, ""), undefined], () =>
    frappe.getCount("Payment Entry", filters),
  );
};

const customers: Prefetcher = (qc) => {
  const sort = "customer_name asc";
  prefetchList(qc, queryKeys.customers.list(1, "", sort), () =>
    frappe.getList("Customer", {
      fields: ["name", "customer_name", "customer_group", "territory", "mobile_no"],
      orderBy: sort,
      limitPageLength: LIST_PAGE_SIZE,
      limitStart: 0,
    }),
  );
  prefetchCount(qc, queryKeys.customers.count(""), () => frappe.getCount("Customer", []));
};

const vendors: Prefetcher = (qc) => {
  const sort = "supplier_name asc";
  prefetchList(qc, queryKeys.suppliers.list(1, "", sort), () =>
    frappe.getList("Supplier", {
      fields: ["name", "supplier_name", "supplier_group", "country", "mobile_no"],
      orderBy: sort,
      limitPageLength: LIST_PAGE_SIZE,
      limitStart: 0,
    }),
  );
  prefetchCount(qc, queryKeys.suppliers.count(""), () => frappe.getCount("Supplier", []));
};

const products: Prefetcher = (qc) => {
  const sort = "item_code asc";
  prefetchList(qc, queryKeys.items.list(1, "", sort), () =>
    frappe.getList("Item", {
      fields: [
        "name",
        "item_code",
        "item_name",
        "item_group",
        "stock_uom",
        "disabled",
        "image",
      ],
      orderBy: sort,
      limitPageLength: LIST_PAGE_SIZE,
      limitStart: 0,
    }),
  );
  prefetchCount(qc, queryKeys.items.count(""), () => frappe.getCount("Item", []));
};

const PREFETCHERS: Record<string, Prefetcher> = {
  "/sales-invoices": salesInvoices,
  "/purchase-invoices": purchaseInvoices,
  "/payments": payments,
  "/customers": customers,
  "/vendors": vendors,
  "/products": products,
};

export function prefetchRoute(qc: QueryClient, href: string, company: string) {
  const fn = PREFETCHERS[href];
  if (fn) fn(qc, company);
}
