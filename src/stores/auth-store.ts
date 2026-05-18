import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearTenantState } from "@/lib/clear-tenant-state";

interface AuthState {
  user: string | null;
  fullName: string | null;
  siteUrl: string;
  csrfToken: string | null;
  directFetch: boolean;
  setUser: (user: string | null) => void;
  setFullName: (name: string | null) => void;
  setSiteUrl: (url: string) => void;
  setCsrfToken: (token: string | null) => void;
  setDirectFetch: (directFetch: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      fullName: null,
      siteUrl: "",
      csrfToken: null,
      directFetch: false,
      setUser: (user) => set({ user }),
      setFullName: (fullName) => set({ fullName }),
      setSiteUrl: (siteUrl) => set({ siteUrl }),
      setCsrfToken: (csrfToken) => set({ csrfToken }),
      setDirectFetch: (directFetch) => set({ directFetch }),
      logout: () => {
        set({
          user: null,
          fullName: null,
          csrfToken: null,
          siteUrl: "",
          directFetch: false,
        });
        clearTenantState();
      },
    }),
    {
      name: "erpnext-auth",
      partialize: (state) => ({
        siteUrl: state.siteUrl,
        directFetch: state.directFetch,
      }),
    },
  ),
);
