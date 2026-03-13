export type ModuleGroupKey =
  | "main"
  | "master-data"
  | "transactions"
  | "stock"
  | "serial-tracking"
  | "accounting"
  | "reports";

export interface ModuleGroup {
  label: string;
  description: string;
  routes: string[];
  alwaysEnabled?: boolean;
}

export const MODULE_GROUPS: Record<ModuleGroupKey, ModuleGroup> = {
  main: {
    label: "Main",
    description: "Dashboard, Expenses, Fund Transfer",
    routes: ["/dashboard", "/expenses", "/funds"],
    alwaysEnabled: true,
  },
  "master-data": {
    label: "Master Data",
    description: "Products, Customers, Vendors, Employees",
    routes: ["/products", "/customers", "/vendors", "/employees"],
  },
  transactions: {
    label: "Transactions",
    description: "Quotations, Orders, Invoices, Payments",
    routes: [
      "/quotations",
      "/sales-orders",
      "/delivery-notes",
      "/sales-invoices",
      "/purchase-orders",
      "/purchase-invoices",
      "/payments",
    ],
  },
  stock: {
    label: "Stock",
    description: "Warehouses, Stock Entries, Stock Ledger",
    routes: ["/warehouses", "/stock-entries", "/stock-ledger"],
  },
  "serial-tracking": {
    label: "Serial Tracking",
    description: "Serial Numbers, IMEI Codes",
    routes: ["/serial-numbers"],
  },
  accounting: {
    label: "Accounting",
    description: "Banks, Chart of Accounts",
    routes: ["/banks", "/chart-of-accounts"],
  },
  reports: {
    label: "Reports",
    description: "Sales, P&L, Balance Sheet, Trial Balance, Cash Flow, AR, AP, General Ledger",
    routes: ["/reports"],
  },
};

export const ALL_MODULE_GROUP_KEYS = Object.keys(MODULE_GROUPS) as ModuleGroupKey[];

export function isRouteEnabled(pathname: string, enabledGroups?: ModuleGroupKey[]): boolean {
  if (!enabledGroups || enabledGroups.length === 0) return true;

  for (const [key, group] of Object.entries(MODULE_GROUPS)) {
    if (group.alwaysEnabled) continue;
    for (const route of group.routes) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        return enabledGroups.includes(key as ModuleGroupKey);
      }
    }
  }

  return true;
}

export function isSidebarGroupEnabled(
  sidebarLabelKey: string,
  enabledGroups?: ModuleGroupKey[],
): boolean {
  if (!enabledGroups || enabledGroups.length === 0) return true;

  const labelToKey: Record<string, ModuleGroupKey> = {
    main: "main",
    masterData: "master-data",
    transactions: "transactions",
    stock: "stock",
    serialTracking: "serial-tracking",
    accounting: "accounting",
    reports: "reports",
  };

  const key = labelToKey[sidebarLabelKey];
  if (!key) return true;
  if (MODULE_GROUPS[key].alwaysEnabled) return true;
  return enabledGroups.includes(key);
}
