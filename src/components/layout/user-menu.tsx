"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  Check,
  ChevronsUpDown,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import type { Locale, Theme } from "@/stores/ui-settings-store";

const SPRING = { type: "spring" as const, stiffness: 320, damping: 32 };

const THEMES: { value: Theme; key: "light" | "dark" | "system"; icon: typeof Sun }[] = [
  { value: "light", key: "light", icon: Sun },
  { value: "dark", key: "dark", icon: Moon },
  { value: "system", key: "system", icon: Monitor },
];

const LOCALES: { value: Locale; flag: string }[] = [
  { value: "ru", flag: "🇷🇺" },
  { value: "en", flag: "🇺🇸" },
  { value: "uz", flag: "🇺🇿" },
  { value: "uzc", flag: "🇺🇿" },
];

interface UserMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UserMenu({ open = true, onOpenChange }: UserMenuProps) {
  const tAuth = useTranslations("auth");
  const tAppearance = useTranslations("settings.appearance");
  const tRegional = useTranslations("settings.regional");
  const tLangs = useTranslations("settings.languages");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fullName = useAuthStore((s) => s.fullName);
  const logoutStore = useAuthStore((s) => s.logout);
  const { setTheme: setNextTheme } = useTheme();
  const theme = useUISettingsStore((s) => s.theme);
  const setStoreTheme = useUISettingsStore((s) => s.setTheme);
  const locale = useUISettingsStore((s) => s.locale);
  const setLocale = useUISettingsStore((s) => s.setLocale);

  const displayName = fullName ?? user ?? "…";
  const initial = (fullName ?? user ?? "?").slice(0, 1).toUpperCase();
  const currentLocale = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  function applyTheme(next: Theme) {
    setStoreTheme(next);
    setNextTheme(next);
  }

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
    try {
      await fetch("/api/auth/establish", { method: "DELETE", credentials: "include" });
    } catch {
      // non-fatal
    }
    logoutStore();
    router.replace("/login");
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center rounded-md p-1 text-left hover:bg-sidebar-accent/60 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="size-8 shrink-0 rounded-lg">
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
              {initial}
            </AvatarFallback>
          </Avatar>
          <motion.div
            animate={{ width: open ? "auto" : 0, opacity: open ? 1 : 0 }}
            transition={SPRING}
            className="ml-2 flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap"
          >
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-xs font-medium">{displayName}</span>
              {user && fullName && user !== fullName ? (
                <span className="truncate text-[10px] text-sidebar-foreground/60">{user}</span>
              ) : null}
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/60" />
          </motion.div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" sideOffset={4} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{displayName}</p>
          {user && user !== displayName ? (
            <p className="text-xs text-muted-foreground truncate">{user}</p>
          ) : null}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 size-4" />
            <span className="flex-1">{tAppearance("theme")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {THEMES.map((th) => {
              const Icon = th.icon;
              return (
                <DropdownMenuItem key={th.value} onClick={() => applyTheme(th.value)}>
                  <Icon className="mr-2 size-4" />
                  <span className="flex-1">{tAppearance(th.key)}</span>
                  {theme === th.value && <Check className="size-3.5" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="mr-2 size-4" />
            <span className="flex-1">{tRegional("language")}</span>
            <span className="text-xs">{currentLocale.flag}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LOCALES.map((loc) => (
              <DropdownMenuItem key={loc.value} onClick={() => setLocale(loc.value)}>
                <span className="mr-2">{loc.flag}</span>
                <span className="flex-1">{tLangs(loc.value)}</span>
                {locale === loc.value && <Check className="size-3.5" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 size-4" />
            {tAuth("settings")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          {tAuth("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
