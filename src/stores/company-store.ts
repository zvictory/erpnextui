import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompanyState {
  company: string;
  currencySymbol: string;
  symbolOnRight: boolean;
  setCompany: (company: string) => void;
  setCurrency: (symbol: string, onRight: boolean) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      company: "",
      currencySymbol: "$",
      symbolOnRight: false,
      setCompany: (company) => set({ company }),
      setCurrency: (currencySymbol, symbolOnRight) =>
        set({ currencySymbol, symbolOnRight }),
    }),
    {
      name: "erpnext-company",
    },
  ),
);
