"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { useAdminSession } from "@/hooks/use-admin";

export default function AdminLoginPage() {
  const router = useRouter();
  const { data, isLoading } = useAdminSession();

  useEffect(() => {
    if (isLoading) return;
    if (!data?.setupComplete) {
      router.replace("/admin/setup");
    } else if (data?.valid) {
      router.replace("/admin");
    }
  }, [data, isLoading, router]);

  if (isLoading || data?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AdminLoginForm />
    </div>
  );
}
