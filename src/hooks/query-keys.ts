export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  companies: {
    all: ["companies"] as const,
    currency: (code: string) => ["companies", "currency", code] as const,
  },
  accounts: {
    bank: (company: string) => ["accounts", "bank", company] as const,
    expense: (company: string) => ["accounts", "expense", company] as const,
    expenseGroups: (company: string) =>
      ["accounts", "expenseGroups", company] as const,
  },
  journalEntries: {
    list: (company: string) => ["journalEntries", "list", company] as const,
    detail: (name: string) => ["journalEntries", "detail", name] as const,
  },
};
