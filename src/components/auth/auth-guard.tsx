"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSessionCheck, fetchCsrfToken } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { FrappeAPIError } from "@/lib/frappe-types";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { data: user, isLoading, isError, error } = useSessionCheck();
  const storedUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isError) {
      const is401 =
        error instanceof FrappeAPIError && error.status === 401;
      const isForbidden =
        error instanceof FrappeAPIError && error.status === 403;

      if (is401 || isForbidden || isError) {
        useAuthStore.getState().setUser(null);
        router.replace("/login");
      }
    }
  }, [isError, error, router]);

  useEffect(() => {
    if (user && !storedUser) {
      useAuthStore.getState().setUser(user);
    }
    if (user) {
      fetchCsrfToken().catch(() => {
        // CSRF fetch failure is non-critical for API key auth
      });
    }
  }, [user, storedUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return null;
  }

  return <>{children}</>;
}
