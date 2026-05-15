"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-svh pl-14">
        <AppSidebar />
        <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
