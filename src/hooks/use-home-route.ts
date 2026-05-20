"use client";

import { useMemo } from "react";
import { useMyPermissions } from "./use-my-permissions";
import { NAV_GROUPS } from "@/lib/permissions/nav-items";

const NAV_HREFS: Record<string, string> = {
  "nav.dashboard": "/dashboard",
  "nav.expense": "/expenses/new",
  "nav.income": "/incomes/new",
  "nav.fundTransfer": "/funds/transfer",
  "nav.products": "/products",
  "nav.customers": "/customers",
  "nav.vendors": "/vendors",
  "nav.partners": "/partners",
  "nav.employees": "/employees",
  "nav.priceLists": "/price-lists",
  "nav.quotations": "/quotations",
  "nav.salesOrders": "/sales-orders",
  "nav.deliveryNotes": "/delivery-notes",
  "nav.salesInvoices": "/sales-invoices",
  "nav.purchaseOrders": "/purchase-orders",
  "nav.purchaseInvoices": "/purchase-invoices",
  "nav.payments": "/payments",
  "nav.warehouses": "/warehouses",
  "nav.stockEntries": "/stock-entries",
  "nav.stockLedger": "/stock-ledger",
  "nav.banks": "/banks",
  "nav.chartOfAccounts": "/chart-of-accounts",
  "nav.whDashboard": "/warehouse",
  "nav.whPicking": "/warehouse/picking",
  "nav.whStockCheck": "/warehouse/stock-check",
  "nav.whPacking": "/warehouse/packing",
  "nav.whInvoicing": "/warehouse/invoicing",
  "nav.oeeDashboard": "/factory",
  "nav.layoutEditor": "/factory/editor",
  "nav.mfgDashboard": "/manufacturing",
  "nav.production": "/manufacturing/production",
  "nav.downtime": "/manufacturing/downtime",
  "nav.energy": "/manufacturing/energy",
  "nav.mfgProducts": "/manufacturing/products",
  "nav.mfgLines": "/manufacturing/lines",
  "nav.mfgSettings": "/manufacturing/settings",
  "nav.mfgErpDashboard": "/manufacturing/dashboard",
  "nav.workOrders": "/manufacturing/work-orders",
  "nav.bom": "/manufacturing/bom",
  "nav.jobCards": "/manufacturing/job-cards",
  "nav.workstations": "/manufacturing/workstations",
  "nav.costingDashboard": "/manufacturing/costing-dashboard",
  "nav.laborReport": "/manufacturing/labor-report",
  "nav.assets": "/assets",
  "nav.maintenanceDashboard": "/maintenance",
  "nav.maintenanceLogs": "/maintenance/logs",
  "nav.maintenanceSchedule": "/maintenance/schedule",
  "nav.spareParts": "/maintenance/spare-parts",
  "nav.sales": "/reports/sales",
  "nav.salesByItem": "/reports/sales-by-item",
  "nav.salesByCustomer": "/reports/sales-by-customer",
  "nav.warehouseTransfers": "/reports/warehouse-transfers",
  "nav.salesAnalytics": "/reports/sales-analytics",
  "nav.profitLoss": "/reports/profit-loss",
  "nav.balanceSheet": "/reports/balance-sheet",
  "nav.trialBalance": "/reports/trial-balance",
  "nav.cashFlow": "/reports/cash-flow",
  "nav.accountsReceivable": "/reports/accounts-receivable",
  "nav.customerBalanceSummary": "/reports/customer-balance-summary",
  "nav.accountsPayable": "/reports/accounts-payable",
  "nav.generalLedger": "/reports/general-ledger",
  "nav.currencyAudit": "/reports/currency-audit",
  "nav.settings": "/settings",
  "nav.permissions": "/settings/permissions",
};

export function useHomeRoute(): { route: string | null; isLoading: boolean } {
  const { data, isLoading } = useMyPermissions();

  return useMemo(() => {
    if (isLoading) return { route: null, isLoading: true };
    if (data.isSuperuser) return { route: "/dashboard", isLoading: false };
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (data.capabilities.has(item.navCapability)) {
          const href = NAV_HREFS[item.navCapability];
          if (href) return { route: href, isLoading: false };
        }
      }
    }
    return { route: "/sales-orders", isLoading: false };
  }, [data, isLoading]);
}
