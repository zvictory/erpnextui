"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/hooks/use-admin";

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading } = useAdminSession();

  useEffect(() => {
    if (isLoading) return;
    if (!data?.setupComplete) {
      router.replace("/admin/setup");
    } else if (!data?.valid) {
      router.replace("/admin/login");
    }
  }, [data, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!data?.valid) return null;

  return <>{children}</>;
}
