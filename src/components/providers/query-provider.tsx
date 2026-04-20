"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { FrappeAPIError } from "@/lib/frappe-types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (error) => {
        if (error instanceof FrappeAPIError && error.status === 403) {
          toast.error("You don't have permission to perform this action");
        }
      },
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
