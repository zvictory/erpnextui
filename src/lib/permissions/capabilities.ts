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
