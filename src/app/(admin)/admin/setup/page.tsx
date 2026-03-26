"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSetupForm } from "@/components/admin/admin-setup-form";
import { useSetupStatus } from "@/hooks/use-admin";

export default function AdminSetupPage() {
  const router = useRouter();
  const { data, isLoading } = useSetupStatus();

  useEffect(() => {
    if (!isLoading && data?.setupComplete) {
      router.replace("/admin/login");
    }
  }, [data, isLoading, router]);

  if (isLoading || data?.setupComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AdminSetupForm />
    </div>
  );
}
