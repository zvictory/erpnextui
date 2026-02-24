"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Left: Title */}
          <div className="flex shrink-0 items-center">
            <h1 className="text-lg font-semibold tracking-tight">ERPNext</h1>
          </div>

          {/* Center: Company Switcher */}
          <div className="flex items-center">
            <CompanySwitcher />
          </div>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
