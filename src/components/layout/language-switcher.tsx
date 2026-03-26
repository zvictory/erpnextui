"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import type { Locale } from "@/stores/ui-settings-store";

const LOCALES: { value: Locale; flag: string; label: string; badge: string }[] = [
  { value: "ru", flag: "🇷🇺", label: "Русский", badge: "РУС" },
  { value: "en", flag: "🇺🇸", label: "English", badge: "ENG" },
  { value: "uz", flag: "🇺🇿", label: "O'zbekcha", badge: "UZB" },
  { value: "uzc", flag: "🇺🇿", label: "Ўзбекча", badge: "ЎЗБ" },
];

interface LanguageSwitcherProps {
  /** When true, renders as a ghost button (for headers). Default: outlined (for public pages). */
  variant?: "ghost" | "outline";
}

export function LanguageSwitcher({ variant = "ghost" }: LanguageSwitcherProps) {
  const locale = useUISettingsStore((s) => s.locale);
  const setLocale = useUISettingsStore((s) => s.setLocale);

  const current = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="h-8 gap-1.5 px-2.5 text-xs font-medium">
          <span>{current.flag}</span>
          <span>{current.badge}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.value}
            onClick={() => setLocale(loc.value)}
            className={locale === loc.value ? "bg-accent" : undefined}
          >
            <span className="mr-2">{loc.flag}</span>
            {loc.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
