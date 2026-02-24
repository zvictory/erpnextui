import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: string | null;
  apiKey: string;
  apiSecret: string;
  csrfToken: string | null;
  setUser: (user: string | null) => void;
  setApiCredentials: (key: string, secret: string) => void;
  setCsrfToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      apiKey: "",
      apiSecret: "",
      csrfToken: null,
      setUser: (user) => set({ user }),
      setApiCredentials: (apiKey, apiSecret) => set({ apiKey, apiSecret }),
      setCsrfToken: (csrfToken) => set({ csrfToken }),
      logout: () => set({ user: null, csrfToken: null }),
    }),
    {
      name: "erpnext-auth",
      partialize: (state) => ({
        apiKey: state.apiKey,
        apiSecret: state.apiSecret,
      }),
    },
  ),
);
