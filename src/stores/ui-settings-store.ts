import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DateFormat =
  | "yyyy-MM-dd"
  | "dd/MM/yyyy"
  | "MM/dd/yyyy"
  | "dd MMM yyyy"
  | "MMM dd, yyyy";
export type NumberFormat = "1,234.56" | "1.234,56" | "1 234,56";
export type Theme = "light" | "dark" | "system";
export type Locale = "en" | "ru" | "uz" | "uzc";

export interface CompanySpecificSettings {
  salaryExpenseAccount: string;
  salaryPayableAccount: string;
  iceCreamDebitAccount: string;
  iceCreamCreditAccount: string;
  iceCreamCurrency: string;
  iceCreamCustomer: string;
  iceCreamCustomerARAccount: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySpecificSettings = {
  salaryExpenseAccount: "",
  salaryPayableAccount: "",
  iceCreamDebitAccount: "",
  iceCreamCreditAccount: "",
  iceCreamCurrency: "",
  iceCreamCustomer: "",
  iceCreamCustomerARAccount: "",
};

interface UISettingsState {
  // Existing
  autoCollapseSidebar: boolean;
  setAutoCollapseSidebar: (v: boolean) => void;
  // Appearance
  theme: Theme;
  setTheme: (v: Theme) => void;
  // Regional
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  setDateFormat: (v: DateFormat) => void;
  setNumberFormat: (v: NumberFormat) => void;
  // Language
  locale: Locale;
  setLocale: (v: Locale) => void;
  // Invoice columns
  invoiceShowUom: boolean;
  invoiceShowDiscountPercent: boolean;
  invoiceShowDiscountAmount: boolean;
  setInvoiceShowUom: (v: boolean) => void;
  setInvoiceShowDiscountPercent: (v: boolean) => void;
  setInvoiceShowDiscountAmount: (v: boolean) => void;
  // Per-company settings
  companySettings: Record<string, CompanySpecificSettings>;
  getCompanySettings: (company: string) => CompanySpecificSettings;
  updateCompanySetting: <K extends keyof CompanySpecificSettings>(
    company: string,
    key: K,
    value: CompanySpecificSettings[K],
  ) => void;
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set, get) => ({
      autoCollapseSidebar: false,
      setAutoCollapseSidebar: (autoCollapseSidebar) => set({ autoCollapseSidebar }),
      theme: "system",
      setTheme: (theme) => set({ theme }),
      dateFormat: "dd MMM yyyy",
      numberFormat: "1 234,56",
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
      locale: "ru",
      setLocale: (locale) => set({ locale }),
      invoiceShowUom: true,
      invoiceShowDiscountPercent: true,
      invoiceShowDiscountAmount: true,
      setInvoiceShowUom: (invoiceShowUom) => set({ invoiceShowUom }),
      setInvoiceShowDiscountPercent: (invoiceShowDiscountPercent) =>
        set({ invoiceShowDiscountPercent }),
      setInvoiceShowDiscountAmount: (invoiceShowDiscountAmount) =>
        set({ invoiceShowDiscountAmount }),
      companySettings: {},
      getCompanySettings: (company) => {
        return get().companySettings[company] ?? DEFAULT_COMPANY_SETTINGS;
      },
      updateCompanySetting: (company, key, value) => {
        set((state) => ({
          companySettings: {
            ...state.companySettings,
            [company]: {
              ...(state.companySettings[company] ?? DEFAULT_COMPANY_SETTINGS),
              [key]: value,
            },
          },
        }));
      },
    }),
    {
      name: "erpnext-ui-settings",
      version: 8,
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<UISettingsState>),
      }),
      migrate: (state, version) => {
        const s = state as Record<string, unknown>;
        if ((version ?? 0) < 1) {
          if (s.numberFormat === "1,234.56") {
            s.numberFormat = "1 234,56";
          }
        }
        // v2 → v3: drop colorPalette
        delete s.colorPalette;
        delete s.setColorPalette;
        // v3 → v4: locale defaults apply automatically

        // v7 → v8: move flat company-specific fields into companySettings
        if ((version ?? 0) < 8) {
          const hasAnyOldField =
            s.salaryExpenseAccount ||
            s.salaryPayableAccount ||
            s.iceCreamDebitAccount ||
            s.iceCreamCreditAccount ||
            s.iceCreamCurrency ||
            s.iceCreamCustomer ||
            s.iceCreamCustomerARAccount;

          if (hasAnyOldField) {
            const migrated: CompanySpecificSettings = {
              salaryExpenseAccount: (s.salaryExpenseAccount as string) ?? "",
              salaryPayableAccount: (s.salaryPayableAccount as string) ?? "",
              iceCreamDebitAccount: (s.iceCreamDebitAccount as string) ?? "",
              iceCreamCreditAccount: (s.iceCreamCreditAccount as string) ?? "",
              iceCreamCurrency: (s.iceCreamCurrency as string) ?? "",
              iceCreamCustomer: (s.iceCreamCustomer as string) ?? "",
              iceCreamCustomerARAccount: (s.iceCreamCustomerARAccount as string) ?? "",
            };
            // Store under "__migrated" key — user will see it under whichever company
            // they had selected. The settings UI will pick it up for the active company.
            s.companySettings = { __migrated: migrated };
          }
          // Clean up old flat fields
          delete s.salaryExpenseAccount;
          delete s.salaryPayableAccount;
          delete s.setSalaryExpenseAccount;
          delete s.setSalaryPayableAccount;
          delete s.iceCreamDebitAccount;
          delete s.iceCreamCreditAccount;
          delete s.iceCreamCurrency;
          delete s.iceCreamCustomer;
          delete s.iceCreamCustomerARAccount;
          delete s.setIceCreamDebitAccount;
          delete s.setIceCreamCreditAccount;
          delete s.setIceCreamCurrency;
          delete s.setIceCreamCustomer;
          delete s.setIceCreamCustomerARAccount;
        }

        return s as unknown as UISettingsState;
      },
    },
  ),
);
