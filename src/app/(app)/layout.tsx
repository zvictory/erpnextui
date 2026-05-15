"use client";

import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useEnabledModules } from "@/hooks/use-enabled-modules";
import { isRouteEnabled } from "@/lib/module-groups";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalSearch } from "@/components/shared/global-search";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useRateSync } from "@/hooks/use-exchange-rates";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

function ModuleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const enabledModules = useEnabledModules();

  useEffect(() => {
    if (enabledModules === undefined) return;
    if (!isRouteEnabled(pathname, enabledModules)) {
      router.replace("/dashboard");
    }
  }, [pathname, enabledModules, router]);

  return <>{children}</>;
}

function RateSyncTrigger() {
  useRateSync();
  return null;
}

function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const onShowShortcuts = useCallback(() => setShowShortcuts(true), []);
  useKeyboardShortcuts({ onShowShortcuts });

  return (
    <>
      {children}
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <RealtimeProvider>
        <ShortcutsProvider>
          <div className="flex min-h-svh pl-14">
            <AppSidebar />
            <RateSyncTrigger />
            <main className="flex-1 min-w-0 p-4 md:p-6">
              <ModuleGuard>{children}</ModuleGuard>
            </main>
          </div>
          <GlobalSearch />
        </ShortcutsProvider>
      </RealtimeProvider>
    </AuthGuard>
  );
}
