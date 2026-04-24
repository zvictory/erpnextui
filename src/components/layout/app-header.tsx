"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User, Sun, Moon, Monitor, Search } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import type { Theme } from "@/stores/ui-settings-store";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const THEME_CYCLE: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

function ThemeToggle() {
  const { setTheme: setNextTheme, resolvedTheme } = useTheme();
  const storeTheme = useUISettingsStore((s) => s.theme);
  const setStoreTheme = useUISettingsStore((s) => s.setTheme);

  function cycleTheme() {
    const currentIdx = THEME_CYCLE.findIndex((t) => t.value === storeTheme);
    const next = THEME_CYCLE[(currentIdx + 1) % THEME_CYCLE.length];
    setStoreTheme(next.value);
    setNextTheme(next.value);
  }

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={cycleTheme}
      title={`Theme: ${storeTheme}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function PilotBadge() {
  if (process.env.NEXT_PUBLIC_PILOT !== "1") return null;
  return (
    <span
      className="ml-1 inline-flex h-5 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400"
      title="Pilot build — next.erpstable.com"
    >
      Beta
    </span>
  );
}

function SearchTrigger() {
  const t = useTranslations("common");

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="hidden h-8 gap-2 text-muted-foreground sm:flex"
      onClick={openSearch}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="text-xs">{t("globalSearch")}</span>
      <kbd className="pointer-events-none ml-2 inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        {t("globalSearchShortcut")}
      </kbd>
    </Button>
  );
}

export function AppHeader() {
  const t = useTranslations("auth");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fullName = useAuthStore((s) => s.fullName);
  const logout = useAuthStore((s) => s.logout);
  const displayName = fullName || user;

  async function handleLogout() {
    const { siteUrl, csrfToken } = useAuthStore.getState();
    if (siteUrl) {
      try {
        await fetch("/api/proxy/api/method/frappe.auth.logout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Frappe-Site": siteUrl,
            ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
          },
        });
      } catch {
        // non-fatal
      }
    }
    // Tear down server-side permission session cookies.
    try {
      await fetch("/api/auth/establish", { method: "DELETE", credentials: "include" });
    } catch {
      // non-fatal
    }
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <CompanySwitcher />
      <PilotBadge />
      <div className="flex-1" />
      <SearchTrigger />
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href="/settings">
          <Settings className="h-4 w-4" />
        </Link>
      </Button>
      <ThemeToggle />
      <LanguageSwitcher />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="size-4" />
            <span className="hidden sm:inline">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{displayName}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 size-4" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
