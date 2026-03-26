export type PermissionAction =
  | "read"
  | "write"
  | "create"
  | "delete"
  | "submit"
  | "cancel"
  | "amend";

export const FEATURE_DOCTYPES = {
  products: "Item",
  customers: "Customer",
  vendors: "Supplier",
  "sales-invoices": "Sales Invoice",
  "purchase-invoices": "Purchase Invoice",
  "purchase-orders": "Purchase Order",
  "sales-orders": "Sales Order",
  quotations: "Quotation",
  "delivery-notes": "Delivery Note",
  expenses: "Journal Entry",
  accounts: "Account",
  payments: "Payment Entry",
  warehouses: "Warehouse",
  "stock-entries": "Stock Entry",
  employees: "Employee",
  "employee-advances": "Employee Advance",
} as const;

export const MANAGED_DOCTYPES = Object.values(FEATURE_DOCTYPES);

export interface DoctypePermissions {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  submit: boolean;
  cancel: boolean;
  amend: boolean;
}

export const NONE_GRANTED: DoctypePermissions = {
  read: false,
  write: false,
  create: false,
  delete: false,
  submit: false,
  cancel: false,
  amend: false,
};

export const ACTIONS: PermissionAction[] = [
  "read",
  "write",
  "create",
  "delete",
  "submit",
  "cancel",
  "amend",
];
