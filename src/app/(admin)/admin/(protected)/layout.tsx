"use client";

import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen">
        <AdminHeader />
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
