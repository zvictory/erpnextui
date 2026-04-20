export type ScopeDim = "line" | "warehouse" | "company" | null;

export type CapabilityDef = {
  module: string;
  labelKey: string;
  scopeDim: ScopeDim;
};

export const BUILTIN_CAPABILITIES = {
  "platform.admin": {
    module: "platform",
    labelKey: "cap.platform.admin",
    scopeDim: null,
  },

  "production.read": {
    module: "manufacturing",
    labelKey: "cap.production.read",
    scopeDim: "line",
  },
  "production.create": {
    module: "manufacturing",
    labelKey: "cap.production.create",
    scopeDim: "line",
  },
  "production.update": {
    module: "manufacturing",
    labelKey: "cap.production.update",
    scopeDim: "line",
  },
  "production.submit": {
    module: "manufacturing",
    labelKey: "cap.production.submit",
    scopeDim: "line",
  },

  "downtime.read": {
    module: "manufacturing",
    labelKey: "cap.downtime.read",
    scopeDim: "line",
  },
  "downtime.write": {
    module: "manufacturing",
    labelKey: "cap.downtime.write",
    scopeDim: "line",
  },

  "energy.read": {
    module: "manufacturing",
    labelKey: "cap.energy.read",
    scopeDim: null,
  },
  "energy.write": {
    module: "manufacturing",
    labelKey: "cap.energy.write",
    scopeDim: null,
  },

  "lines.manage": {
    module: "manufacturing",
    labelKey: "cap.lines.manage",
    scopeDim: "line",
  },

  "product.read": {
    module: "manufacturing",
    labelKey: "cap.product.read",
    scopeDim: null,
  },
  "product.write": {
    module: "manufacturing",
    labelKey: "cap.product.write",
    scopeDim: null,
  },

  "sales_invoice.read": {
    module: "sales",
    labelKey: "cap.sales_invoice.read",
    scopeDim: null,
  },
  "sales_invoice.create": {
    module: "sales",
    labelKey: "cap.sales_invoice.create",
    scopeDim: null,
  },
  "sales_invoice.submit": {
    module: "sales",
    labelKey: "cap.sales_invoice.submit",
    scopeDim: null,
  },

  "purchase_invoice.read": {
    module: "purchases",
    labelKey: "cap.purchase_invoice.read",
    scopeDim: null,
  },
  "purchase_invoice.create": {
    module: "purchases",
    labelKey: "cap.purchase_invoice.create",
    scopeDim: null,
  },

  "warehouse.read": {
    module: "stock",
    labelKey: "cap.warehouse.read",
    scopeDim: "warehouse",
  },
  "warehouse.manage": {
    module: "stock",
    labelKey: "cap.warehouse.manage",
    scopeDim: "warehouse",
  },
  "stock_entry.create": {
    module: "stock",
    labelKey: "cap.stock_entry.create",
    scopeDim: "warehouse",
  },

  "dashboard.read": {
    module: "platform",
    labelKey: "cap.dashboard.read",
    scopeDim: null,
  },
  "settings.read": {
    module: "platform",
    labelKey: "cap.settings.read",
    scopeDim: null,
  },
  "settings.write": {
    module: "platform",
    labelKey: "cap.settings.write",
    scopeDim: null,
  },

  // ── Nav visibility capabilities ──
  // Each maps 1:1 to a sidebar menu item. Module "nav" groups them separately.
  "nav.dashboard": { module: "nav", labelKey: "nav.dashboard", scopeDim: null },
  "nav.expense": { module: "nav", labelKey: "nav.expense", scopeDim: null },
  "nav.fundTransfer": { module: "nav", labelKey: "nav.fundTransfer", scopeDim: null },

  "nav.products": { module: "nav", labelKey: "nav.products", scopeDim: null },
  "nav.customers": { module: "nav", labelKey: "nav.customers", scopeDim: null },
  "nav.vendors": { module: "nav", labelKey: "nav.vendors", scopeDim: null },
  "nav.partners": { module: "nav", labelKey: "nav.partners", scopeDim: null },
  "nav.employees": { module: "nav", labelKey: "nav.employees", scopeDim: null },
  "nav.priceLists": { module: "nav", labelKey: "nav.priceLists", scopeDim: null },

  "nav.quotations": { module: "nav", labelKey: "nav.quotations", scopeDim: null },
  "nav.salesOrders": { module: "nav", labelKey: "nav.salesOrders", scopeDim: null },
  "nav.deliveryNotes": { module: "nav", labelKey: "nav.deliveryNotes", scopeDim: null },
  "nav.salesInvoices": { module: "nav", labelKey: "nav.salesInvoices", scopeDim: null },
  "nav.purchaseOrders": { module: "nav", labelKey: "nav.purchaseOrders", scopeDim: null },
  "nav.purchaseInvoices": { module: "nav", labelKey: "nav.purchaseInvoices", scopeDim: null },
  "nav.payments": { module: "nav", labelKey: "nav.payments", scopeDim: null },

  "nav.warehouses": { module: "nav", labelKey: "nav.warehouses", scopeDim: null },
  "nav.stockEntries": { module: "nav", labelKey: "nav.stockEntries", scopeDim: null },
  "nav.stockLedger": { module: "nav", labelKey: "nav.stockLedger", scopeDim: null },

  "nav.banks": { module: "nav", labelKey: "nav.banks", scopeDim: null },
  "nav.chartOfAccounts": { module: "nav", labelKey: "nav.chartOfAccounts", scopeDim: null },

  "nav.whDashboard": { module: "nav", labelKey: "nav.whDashboard", scopeDim: null },
  "nav.whPicking": { module: "nav", labelKey: "nav.whPicking", scopeDim: null },
  "nav.whStockCheck": { module: "nav", labelKey: "nav.whStockCheck", scopeDim: null },
  "nav.whPacking": { module: "nav", labelKey: "nav.whPacking", scopeDim: null },
  "nav.whInvoicing": { module: "nav", labelKey: "nav.whInvoicing", scopeDim: null },

  "nav.oeeDashboard": { module: "nav", labelKey: "nav.oeeDashboard", scopeDim: null },
  "nav.layoutEditor": { module: "nav", labelKey: "nav.layoutEditor", scopeDim: null },

  "nav.mfgDashboard": { module: "nav", labelKey: "nav.mfgDashboard", scopeDim: null },
  "nav.production": { module: "nav", labelKey: "nav.production", scopeDim: null },
  "nav.downtime": { module: "nav", labelKey: "nav.downtime", scopeDim: null },
  "nav.energy": { module: "nav", labelKey: "nav.energy", scopeDim: null },
  "nav.mfgProducts": { module: "nav", labelKey: "nav.mfgProducts", scopeDim: null },
  "nav.mfgLines": { module: "nav", labelKey: "nav.mfgLines", scopeDim: null },
  "nav.mfgSettings": { module: "nav", labelKey: "nav.mfgSettings", scopeDim: null },

  "nav.mfgErpDashboard": { module: "nav", labelKey: "nav.mfgErpDashboard", scopeDim: null },
  "nav.workOrders": { module: "nav", labelKey: "nav.workOrders", scopeDim: null },
  "nav.bom": { module: "nav", labelKey: "nav.bom", scopeDim: null },
  "nav.jobCards": { module: "nav", labelKey: "nav.jobCards", scopeDim: null },
  "nav.workstations": { module: "nav", labelKey: "nav.workstations", scopeDim: null },
  "nav.costingDashboard": { module: "nav", labelKey: "nav.costingDashboard", scopeDim: null },
  "nav.laborReport": { module: "nav", labelKey: "nav.laborReport", scopeDim: null },

  "nav.sales": { module: "nav", labelKey: "nav.sales", scopeDim: null },
  "nav.profitLoss": { module: "nav", labelKey: "nav.profitLoss", scopeDim: null },
  "nav.balanceSheet": { module: "nav", labelKey: "nav.balanceSheet", scopeDim: null },
  "nav.trialBalance": { module: "nav", labelKey: "nav.trialBalance", scopeDim: null },
  "nav.cashFlow": { module: "nav", labelKey: "nav.cashFlow", scopeDim: null },
  "nav.accountsReceivable": { module: "nav", labelKey: "nav.accountsReceivable", scopeDim: null },
  "nav.customerBalanceSummary": {
    module: "nav",
    labelKey: "nav.customerBalanceSummary",
    scopeDim: null,
  },
  "nav.accountsPayable": { module: "nav", labelKey: "nav.accountsPayable", scopeDim: null },
  "nav.generalLedger": { module: "nav", labelKey: "nav.generalLedger", scopeDim: null },
  "nav.currencyAudit": { module: "nav", labelKey: "nav.currencyAudit", scopeDim: null },

  "nav.settings": { module: "nav", labelKey: "nav.settings", scopeDim: null },
  "nav.permissions": { module: "nav", labelKey: "nav.permissions", scopeDim: null },

  "nav.assets": { module: "nav", labelKey: "nav.assets", scopeDim: null },
  "nav.maintenanceDashboard": {
    module: "nav",
    labelKey: "nav.maintenanceDashboard",
    scopeDim: null,
  },
  "nav.maintenanceLogs": { module: "nav", labelKey: "nav.maintenanceLogs", scopeDim: null },
  "nav.maintenanceSchedule": { module: "nav", labelKey: "nav.maintenanceSchedule", scopeDim: null },
  "nav.spareParts": { module: "nav", labelKey: "nav.spareParts", scopeDim: null },

  // ── Asset & Maintenance data capabilities ──
  "asset.read": { module: "assets", labelKey: "cap.asset.read", scopeDim: null },
  "asset.write": { module: "assets", labelKey: "cap.asset.write", scopeDim: null },
  "maintenance.read": { module: "assets", labelKey: "cap.maintenance.read", scopeDim: null },
  "maintenance.write": { module: "assets", labelKey: "cap.maintenance.write", scopeDim: null },
} as const satisfies Record<string, CapabilityDef>;

export type BuiltinCapabilityId = keyof typeof BUILTIN_CAPABILITIES;

export type CapabilityId = BuiltinCapabilityId | (string & {});

export function getBuiltinCapability(id: string): CapabilityDef | undefined {
  return (BUILTIN_CAPABILITIES as Record<string, CapabilityDef>)[id];
}

export function listBuiltinCapabilities(): Array<{ id: BuiltinCapabilityId } & CapabilityDef> {
  return (Object.entries(BUILTIN_CAPABILITIES) as Array<[BuiltinCapabilityId, CapabilityDef]>).map(
    ([id, def]) => ({ id, ...def }),
  );
}

export type MergedCapability = {
  id: string;
  module: string;
  labelKey: string;
  scopeDim: ScopeDim;
  isCustom: boolean;
};

export function listAllCapabilities(
  customCaps: Array<{ id: string; module: string; labelKey: string; scopeDim: string | null }>,
): MergedCapability[] {
  const builtin = (Object.entries(BUILTIN_CAPABILITIES) as Array<[string, CapabilityDef]>).map(
    ([id, def]) => ({
      id,
      module: def.module,
      labelKey: def.labelKey,
      scopeDim: def.scopeDim,
      isCustom: false,
    }),
  );

  const seen = new Set(builtin.map((c) => c.id));

  const custom = customCaps
    .filter((c) => !seen.has(c.id))
    .map((c) => ({
      id: c.id,
      module: c.module,
      labelKey: c.labelKey,
      scopeDim: c.scopeDim as ScopeDim,
      isCustom: true,
    }));

  return [...builtin, ...custom];
}
