import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearTenantState } from "@/lib/clear-tenant-state";

interface AuthState {
  user: string | null;
  fullName: string | null;
  siteUrl: string;
  csrfToken: string | null;
  setUser: (user: string | null) => void;
  setFullName: (name: string | null) => void;
  setSiteUrl: (url: string) => void;
  setCsrfToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      fullName: null,
      siteUrl: "",
      csrfToken: null,
      setUser: (user) => set({ user }),
      setFullName: (fullName) => set({ fullName }),
      setSiteUrl: (siteUrl) => set({ siteUrl }),
      setCsrfToken: (csrfToken) => set({ csrfToken }),
      logout: () => {
        set({ user: null, fullName: null, csrfToken: null, siteUrl: "" });
        clearTenantState();
      },
    }),
    {
      name: "erpnext-auth",
      partialize: (state) => ({ siteUrl: state.siteUrl }),
    },
  ),
);
