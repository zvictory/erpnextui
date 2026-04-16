export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
    fullName: (email: string) => ["auth", "fullName", email] as const,
  },
  companies: {
    all: ["companies"] as const,
    currency: (code: string) => ["companies", "currency", code] as const,
    sellingPriceList: (company: string) => ["companies", "sellingPriceList", company] as const,
  },
  accounts: {
    bank: (company: string) => ["accounts", "bank", company] as const,
    bankWithCurrency: (company: string) => ["accounts", "bankWithCurrency", company] as const,
    expense: (company: string) => ["accounts", "expense", company] as const,
    expenseWithCurrency: (company: string) => ["accounts", "expenseWithCurrency", company] as const,
    expenseGroups: (company: string) => ["accounts", "expenseGroups", company] as const,
  },
  journalEntries: {
    list: (company: string, voucherType = "Journal Entry") =>
      ["journalEntries", "list", company, voucherType] as const,
    detail: (name: string) => ["journalEntries", "detail", name] as const,
  },
  dashboard: {
    all: (company: string) => ["dashboard", company] as const,
    salesTrend: (company: string, from: string, to: string) =>
      ["dashboard", "salesTrend", company, from, to] as const,
    profitBreakdown: (company: string, from: string, to: string) =>
      ["dashboard", "profitBreakdown", company, from, to] as const,
    recentInvoices: (company: string) => ["dashboard", "recentInvoices", company] as const,
  },
  itemPrices: {
    forItem: (itemCode: string, priceList: string) => ["itemPrices", itemCode, priceList] as const,
    list: (priceList: string, page: number, search: string, sort: string) =>
      ["itemPrices", "list", priceList, page, search, sort] as const,
    count: (priceList: string, search: string) =>
      ["itemPrices", "count", priceList, search] as const,
  },
  priceLists: {
    selling: ["priceLists", "selling"] as const,
    list: (page: number, search: string, sort: string, type: string) =>
      ["priceLists", "list", page, search, sort, type] as const,
    count: (search: string, type: string) => ["priceLists", "count", search, type] as const,
    detail: (name: string) => ["priceLists", "detail", name] as const,
  },
  items: {
    list: (page: number, search: string, sort: string) =>
      ["items", "list", page, search, sort] as const,
    detail: (name: string) => ["items", "detail", name] as const,
    count: (search: string) => ["items", "count", search] as const,
    purchaseHistory: (itemCode: string, page: number) =>
      ["items", "purchaseHistory", itemCode, page] as const,
    purchaseHistoryCount: (itemCode: string) =>
      ["items", "purchaseHistoryCount", itemCode] as const,
    salesHistory: (itemCode: string, page: number) =>
      ["items", "salesHistory", itemCode, page] as const,
    salesHistoryCount: (itemCode: string) => ["items", "salesHistoryCount", itemCode] as const,
    workOrders: (itemCode: string) => ["items", "workOrders", itemCode] as const,
    activeBom: (itemCode: string) => ["items", "activeBom", itemCode] as const,
  },
  customers: {
    list: (page: number, search: string, sort: string) =>
      ["customers", "list", page, search, sort] as const,
    detail: (name: string) => ["customers", "detail", name] as const,
    count: (search: string) => ["customers", "count", search] as const,
  },
  suppliers: {
    list: (page: number, search: string, sort: string) =>
      ["suppliers", "list", page, search, sort] as const,
    detail: (name: string) => ["suppliers", "detail", name] as const,
    count: (search: string) => ["suppliers", "count", search] as const,
  },
  salesInvoices: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["salesInvoices", "list", company, page, search, sort] as const,
    detail: (name: string) => ["salesInvoices", "detail", name] as const,
    count: (company: string, search: string) =>
      ["salesInvoices", "count", company, search] as const,
  },
  purchaseInvoices: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["purchaseInvoices", "list", company, page, search, sort] as const,
    detail: (name: string) => ["purchaseInvoices", "detail", name] as const,
    count: (company: string, search: string) =>
      ["purchaseInvoices", "count", company, search] as const,
  },
  purchaseOrders: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["purchaseOrders", "list", company, page, search, sort] as const,
    detail: (name: string) => ["purchaseOrders", "detail", name] as const,
    count: (company: string, search: string) =>
      ["purchaseOrders", "count", company, search] as const,
  },
  salesOrders: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["salesOrders", "list", company, page, search, sort] as const,
    detail: (name: string) => ["salesOrders", "detail", name] as const,
    count: (company: string, search: string) => ["salesOrders", "count", company, search] as const,
  },
  quotations: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["quotations", "list", company, page, search, sort] as const,
    detail: (name: string) => ["quotations", "detail", name] as const,
    count: (company: string, search: string) => ["quotations", "count", company, search] as const,
  },
  deliveryNotes: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["deliveryNotes", "list", company, page, search, sort] as const,
    detail: (name: string) => ["deliveryNotes", "detail", name] as const,
    count: (company: string, search: string) =>
      ["deliveryNotes", "count", company, search] as const,
  },
  partyBalances: {
    receivable: (company: string) => ["partyBalances", "receivable", company] as const,
    payable: (company: string) => ["partyBalances", "payable", company] as const,
    employee: (company: string) => ["partyBalances", "employee", company] as const,
  },
  partyLedger: {
    list: (partyType: string, party: string, company: string) =>
      ["partyLedger", partyType, party, company] as const,
    drafts: (partyType: string, party: string, company: string) =>
      ["partyLedger", "drafts", partyType, party, company] as const,
  },
  linkOptions: {
    list: (doctype: string, filters?: unknown[], descriptionField?: string) =>
      [
        "linkOptions",
        doctype,
        ...(filters ? [JSON.stringify(filters)] : []),
        ...(descriptionField ? [descriptionField] : []),
      ] as const,
  },
  permissions: {
    all: (user: string) => ["permissions", "all", user] as const,
    grants: ["permissions", "grants"] as const,
  },
  paymentEntries: {
    outstanding: (partyType: string, partyName: string, company: string) =>
      ["paymentEntries", "outstanding", partyType, partyName, company] as const,
    list: (company: string, page: number, search: string, sort: string) =>
      ["paymentEntries", "list", company, page, search, sort] as const,
    detail: (name: string) => ["paymentEntries", "detail", name] as const,
    count: (company: string, search: string) =>
      ["paymentEntries", "count", company, search] as const,
  },
  reports: {
    sales: (company: string, from: string, to: string, groupBy: string) =>
      ["reports", "sales", company, from, to, groupBy] as const,
    profitLoss: (company: string, from: string, to: string, periodicity: string) =>
      ["reports", "profitLoss", company, from, to, periodicity] as const,
    balanceSheet: (company: string, from: string, to: string) =>
      ["reports", "balanceSheet", company, from, to] as const,
    salesInvoiceCount: (company: string, from: string, to: string) =>
      ["reports", "salesInvoiceCount", company, from, to] as const,
    trialBalance: (company: string, from: string, to: string) =>
      ["reports", "trialBalance", company, from, to] as const,
    cashFlow: (company: string, from: string, to: string, periodicity: string) =>
      ["reports", "cashFlow", company, from, to, periodicity] as const,
    accountsReceivable: (company: string, asOfDate: string) =>
      ["reports", "accountsReceivable", company, asOfDate] as const,
    arInvoices: (company: string, filters: Record<string, string>) =>
      ["reports", "arInvoices", company, filters] as const,
    accountsPayable: (company: string, asOfDate: string) =>
      ["reports", "accountsPayable", company, asOfDate] as const,
    generalLedger: (company: string, from: string, to: string, account?: string, party?: string) =>
      ["reports", "generalLedger", company, from, to, account, party] as const,
  },
  bankAccounts: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["bankAccounts", "list", company, page, search, sort] as const,
    count: (company: string, search: string) => ["bankAccounts", "count", company, search] as const,
    detail: (name: string) => ["bankAccounts", "detail", name] as const,
  },
  coaAccounts: {
    list: (company: string, page: number, search: string, sort: string, showGroups: boolean) =>
      ["coaAccounts", "list", company, page, search, sort, showGroups] as const,
    count: (company: string, search: string, showGroups: boolean) =>
      ["coaAccounts", "count", company, search, showGroups] as const,
    tree: (company: string) => ["coaAccounts", "tree", company] as const,
  },
  bankReconciliation: {
    unreconciled: (account: string, toDate: string) =>
      ["bankReconciliation", "unreconciled", account, toDate] as const,
  },
  glEntries: {
    list: (account: string, page: number, sort: string) =>
      ["glEntries", "list", account, page, sort] as const,
    count: (account: string) => ["glEntries", "count", account] as const,
  },
  ledger: {
    entries: (account: string, page: number, sort: string, fromDate?: string, toDate?: string) =>
      ["ledger", "entries", account, page, sort, fromDate, toDate] as const,
    count: (account: string, fromDate?: string, toDate?: string) =>
      ["ledger", "count", account, fromDate, toDate] as const,
    accountDetail: (name: string) => ["ledger", "accountDetail", name] as const,
    exchangeRate: (from: string, to: string) => ["ledger", "exchangeRate", from, to] as const,
  },
  groupAccounts: (company: string) => ["groupAccounts", company] as const,
  equityAccounts: (company: string) => ["equityAccounts", company] as const,
  currencies: ["currencies"] as const,
  cbuRates: ["cbuRates"] as const,
  rateSync: ["rateSync"] as const,
  warehouses: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["warehouses", "list", company, page, search, sort] as const,
    count: (company: string, search: string) => ["warehouses", "count", company, search] as const,
    detail: (name: string) => ["warehouses", "detail", name] as const,
  },
  stockEntries: {
    list: (company: string, page: number, search: string, sort: string) =>
      ["stockEntries", "list", company, page, search, sort] as const,
    count: (company: string, search: string) => ["stockEntries", "count", company, search] as const,
    detail: (name: string) => ["stockEntries", "detail", name] as const,
  },
  stockLedger: {
    list: (itemCode: string, warehouse: string, page: number) =>
      ["stockLedger", "list", itemCode, warehouse, page] as const,
    count: (itemCode: string, warehouse: string) =>
      ["stockLedger", "count", itemCode, warehouse] as const,
  },
  bins: {
    byItem: (itemCode: string) => ["bins", "byItem", itemCode] as const,
    byWarehouse: (warehouse: string) => ["bins", "byWarehouse", warehouse] as const,
  },
  employees: {
    list: (page: number, search: string, sort: string) =>
      ["employees", "list", page, search, sort] as const,
    detail: (name: string) => ["employees", "detail", name] as const,
    count: (search: string) => ["employees", "count", search] as const,
  },
  salary: {
    employees: (company: string) => ["salary", "employees", company] as const,
    accrualCheck: (company: string, month: string) =>
      ["salary", "accrualCheck", company, month] as const,
  },
  employeeAdvances: {
    list: (employee: string, company: string) =>
      ["employeeAdvances", "list", employee, company] as const,
    detail: (name: string) => ["employeeAdvances", "detail", name] as const,
    balances: (company: string) => ["employeeAdvances", "balances", company] as const,
  },
  loans: {
    balances: (company: string) => ["loans", "balances", company] as const,
  },
  admin: {
    session: ["admin", "session"] as const,
    setup: ["admin", "setup"] as const,
    tenants: ["admin", "tenants"] as const,
    tenant: (id: string) => ["admin", "tenants", id] as const,
    settings: ["admin", "settings"] as const,
    registrations: ["admin", "registrations"] as const,
    registration: (id: string) => ["admin", "registrations", id] as const,
  },
  enabledModules: {
    current: (siteUrl: string) => ["enabledModules", siteUrl] as const,
  },
  billing: {
    status: (siteUrl: string) => ["billing", "status", siteUrl] as const,
  },
  manufacturing: {
    workOrders: {
      list: (company: string, page: number, search: string, sort: string) =>
        ["manufacturing", "workOrders", "list", company, page, search, sort] as const,
      count: (company: string, search: string) =>
        ["manufacturing", "workOrders", "count", company, search] as const,
      detail: (name: string) => ["manufacturing", "workOrders", "detail", name] as const,
      active: (company: string) => ["manufacturing", "workOrders", "active", company] as const,
    },
    boms: {
      list: (page: number, search: string, sort: string) =>
        ["manufacturing", "boms", "list", page, search, sort] as const,
      count: (search: string) => ["manufacturing", "boms", "count", search] as const,
      detail: (name: string) => ["manufacturing", "boms", "detail", name] as const,
    },
    jobCards: {
      list: (company: string, page: number, search: string, sort: string) =>
        ["manufacturing", "jobCards", "list", company, page, search, sort] as const,
      count: (company: string, search: string) =>
        ["manufacturing", "jobCards", "count", company, search] as const,
      detail: (name: string) => ["manufacturing", "jobCards", "detail", name] as const,
    },
    workstations: {
      list: (page: number, search: string, sort: string) =>
        ["manufacturing", "workstations", "list", page, search, sort] as const,
      count: (search: string) => ["manufacturing", "workstations", "count", search] as const,
      detail: (name: string) => ["manufacturing", "workstations", "detail", name] as const,
    },
    manufactureEntries: {
      list: (company: string, page: number, search: string, sort: string) =>
        ["manufacturing", "manufactureEntries", "list", company, page, search, sort] as const,
      count: (company: string, search: string) =>
        ["manufacturing", "manufactureEntries", "count", company, search] as const,
    },
    dashboard: {
      metrics: (company: string) => ["manufacturing", "dashboard", "metrics", company] as const,
      materialStatus: (company: string) =>
        ["manufacturing", "dashboard", "materialStatus", company] as const,
      workstationStatus: (company: string) =>
        ["manufacturing", "dashboard", "workstationStatus", company] as const,
    },
  },
  serialNumbers: {
    listByItem: (itemCode: string, company: string, page: number, search: string, sort: string) =>
      ["serialNumbers", "listByItem", itemCode, company, page, search, sort] as const,
    countByItem: (itemCode: string, company: string, search: string) =>
      ["serialNumbers", "countByItem", itemCode, company, search] as const,
    detail: (name: string) => ["serialNumbers", "detail", name] as const,
  },
  workflow: {
    active: (doctype: string) => ["workflow", "active", doctype] as const,
    transitions: (doctype: string, docname: string) =>
      ["workflow", "transitions", doctype, docname] as const,
  },
  costing: {
    employeeCost: (name: string) => ["costing", "employeeCost", name] as const,
    directLaborEmployees: ["costing", "directLaborEmployees"] as const,
    woTabel: (workOrder: string) => ["costing", "woTabel", workOrder] as const,
    cumulativeCosts: (from: string, to: string) =>
      ["costing", "cumulativeCosts", from, to] as const,
    productBreakdown: (from: string, to: string, method: string) =>
      ["costing", "productBreakdown", from, to, method] as const,
    variance: (from: string, to: string) => ["costing", "variance", from, to] as const,
    workstationEnergy: (from: string, to: string) =>
      ["costing", "workstationEnergy", from, to] as const,
    maintenanceCosts: (from: string, to: string) =>
      ["costing", "maintenanceCosts", from, to] as const,
  },
};
