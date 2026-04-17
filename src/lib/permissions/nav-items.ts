import type { BuiltinCapabilityId } from "./capabilities";

export type NavItemDef = {
  tKey: string;
  navCapability: BuiltinCapabilityId;
};

export type NavGroupDef = {
  groupKey: string;
  items: NavItemDef[];
};

/** Ordered list of sidebar nav groups and their items — used by both sidebar and grant editor. */
export const NAV_GROUPS: NavGroupDef[] = [
  {
    groupKey: "main",
    items: [
      { tKey: "dashboard", navCapability: "nav.dashboard" },
      { tKey: "expense", navCapability: "nav.expense" },
      { tKey: "fundTransfer", navCapability: "nav.fundTransfer" },
    ],
  },
  {
    groupKey: "masterData",
    items: [
      { tKey: "products", navCapability: "nav.products" },
      { tKey: "customers", navCapability: "nav.customers" },
      { tKey: "vendors", navCapability: "nav.vendors" },
      { tKey: "partners", navCapability: "nav.partners" },
      { tKey: "employees", navCapability: "nav.employees" },
      { tKey: "priceLists", navCapability: "nav.priceLists" },
    ],
  },
  {
    groupKey: "transactions",
    items: [
      { tKey: "quotations", navCapability: "nav.quotations" },
      { tKey: "salesOrders", navCapability: "nav.salesOrders" },
      { tKey: "deliveryNotes", navCapability: "nav.deliveryNotes" },
      { tKey: "salesInvoices", navCapability: "nav.salesInvoices" },
      { tKey: "purchaseOrders", navCapability: "nav.purchaseOrders" },
      { tKey: "purchaseInvoices", navCapability: "nav.purchaseInvoices" },
      { tKey: "payments", navCapability: "nav.payments" },
    ],
  },
  {
    groupKey: "stock",
    items: [
      { tKey: "warehouses", navCapability: "nav.warehouses" },
      { tKey: "stockEntries", navCapability: "nav.stockEntries" },
      { tKey: "stockLedger", navCapability: "nav.stockLedger" },
    ],
  },
  {
    groupKey: "accounting",
    items: [
      { tKey: "banks", navCapability: "nav.banks" },
      { tKey: "chartOfAccounts", navCapability: "nav.chartOfAccounts" },
    ],
  },
  {
    groupKey: "warehouse",
    items: [
      { tKey: "whDashboard", navCapability: "nav.whDashboard" },
      { tKey: "whPicking", navCapability: "nav.whPicking" },
      { tKey: "whStockCheck", navCapability: "nav.whStockCheck" },
      { tKey: "whPacking", navCapability: "nav.whPacking" },
      { tKey: "whInvoicing", navCapability: "nav.whInvoicing" },
    ],
  },
  {
    groupKey: "factory",
    items: [
      { tKey: "oeeDashboard", navCapability: "nav.oeeDashboard" },
      { tKey: "layoutEditor", navCapability: "nav.layoutEditor" },
    ],
  },
  {
    groupKey: "oee",
    items: [
      { tKey: "mfgDashboard", navCapability: "nav.mfgDashboard" },
      { tKey: "production", navCapability: "nav.production" },
      { tKey: "downtime", navCapability: "nav.downtime" },
      { tKey: "energy", navCapability: "nav.energy" },
      { tKey: "mfgProducts", navCapability: "nav.mfgProducts" },
      { tKey: "mfgLines", navCapability: "nav.mfgLines" },
      { tKey: "mfgSettings", navCapability: "nav.mfgSettings" },
    ],
  },
  {
    groupKey: "manufacturing",
    items: [
      { tKey: "mfgErpDashboard", navCapability: "nav.mfgErpDashboard" },
      { tKey: "workOrders", navCapability: "nav.workOrders" },
      { tKey: "bom", navCapability: "nav.bom" },
      { tKey: "jobCards", navCapability: "nav.jobCards" },
      { tKey: "workstations", navCapability: "nav.workstations" },
      { tKey: "costingDashboard", navCapability: "nav.costingDashboard" },
    ],
  },
  {
    groupKey: "assetMaintenance",
    items: [
      { tKey: "assets", navCapability: "nav.assets" },
      { tKey: "maintenanceDashboard", navCapability: "nav.maintenanceDashboard" },
      { tKey: "maintenanceLogs", navCapability: "nav.maintenanceLogs" },
      { tKey: "maintenanceSchedule", navCapability: "nav.maintenanceSchedule" },
      { tKey: "spareParts", navCapability: "nav.spareParts" },
    ],
  },
  {
    groupKey: "reports",
    items: [
      { tKey: "sales", navCapability: "nav.sales" },
      { tKey: "profitLoss", navCapability: "nav.profitLoss" },
      { tKey: "balanceSheet", navCapability: "nav.balanceSheet" },
      { tKey: "trialBalance", navCapability: "nav.trialBalance" },
      { tKey: "cashFlow", navCapability: "nav.cashFlow" },
      { tKey: "accountsReceivable", navCapability: "nav.accountsReceivable" },
      { tKey: "customerBalanceSummary", navCapability: "nav.customerBalanceSummary" },
      { tKey: "accountsPayable", navCapability: "nav.accountsPayable" },
      { tKey: "generalLedger", navCapability: "nav.generalLedger" },
      { tKey: "currencyAudit", navCapability: "nav.currencyAudit" },
    ],
  },
  {
    groupKey: "admin",
    items: [
      { tKey: "settings", navCapability: "nav.settings" },
      { tKey: "permissions", navCapability: "nav.permissions" },
    ],
  },
];

/** Set of all nav capability IDs for quick membership checks. */
export const ALL_NAV_CAPABILITY_IDS: Set<string> = new Set(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => i.navCapability)),
);
