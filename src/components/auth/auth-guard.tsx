"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSessionCheck, useFullName, fetchCsrfToken } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { FrappeAPIError } from "@/lib/frappe-types";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { data: user, isLoading, isError, error } = useSessionCheck();
  const storedUser = useAuthStore((s) => s.user);
  const csrfToken = useAuthStore((s) => s.csrfToken);
  const [csrfReady, setCsrfReady] = useState(!!csrfToken);

  useEffect(() => {
    if (isError) {
      const is401 = error instanceof FrappeAPIError && error.status === 401;
      const isForbidden = error instanceof FrappeAPIError && error.status === 403;

      if (is401 || isForbidden || isError) {
        useAuthStore.getState().setUser(null);
        router.replace("/login");
      }
    }
  }, [isError, error, router]);

  const { data: fullName } = useFullName(user ?? null);

  useEffect(() => {
    if (user && !storedUser) {
      useAuthStore.getState().setUser(user);
    }
  }, [user, storedUser]);

  useEffect(() => {
    if (fullName) {
      useAuthStore.getState().setFullName(fullName);
    }
  }, [fullName]);

  useEffect(() => {
    if (user && !csrfReady) {
      fetchCsrfToken()
        .catch(() => {})
        .finally(() => setCsrfReady(true));
    }
  }, [user, csrfReady]);

  if (isLoading || (user && !csrfReady)) {
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
