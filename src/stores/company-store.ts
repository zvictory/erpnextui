import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompanyState {
  company: string;
  currencySymbol: string;
  symbolOnRight: boolean;
  currencyCode: string;
  setCompany: (company: string) => void;
  setCurrency: (symbol: string, onRight: boolean, code: string) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      company: "",
      currencySymbol: "$",
      symbolOnRight: false,
      currencyCode: "",
      setCompany: (company) => set({ company }),
      setCurrency: (currencySymbol, symbolOnRight, currencyCode) =>
        set({ currencySymbol, symbolOnRight, currencyCode }),
    }),
    {
      name: "erpnext-company",
    },
  ),
);
