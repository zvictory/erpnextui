"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchCsrfToken } from "@/hooks/use-auth";
import { useBoot } from "@/hooks/use-boot";
import { useAuthStore } from "@/stores/auth-store";
import { FrappeAPIError } from "@/lib/frappe-types";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { data: boot, isLoading, isError, error } = useBoot();
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

  useEffect(() => {
    if (boot && !csrfReady) {
      fetchCsrfToken()
        .catch(() => {})
        .finally(() => setCsrfReady(true));
    }
  }, [boot, csrfReady]);

  if (isLoading || (boot && !csrfReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError || !boot) {
    return null;
  }

  return <>{children}</>;
}
