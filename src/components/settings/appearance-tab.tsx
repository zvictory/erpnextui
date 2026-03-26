"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import type { Theme } from "@/stores/ui-settings-store";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function AppearanceTab() {
  const t = useTranslations("settings");
  const { setTheme: setNextTheme, theme: currentTheme } = useTheme();
  const storeTheme = useUISettingsStore((s) => s.theme);
  const setStoreTheme = useUISettingsStore((s) => s.setTheme);
  const autoCollapse = useUISettingsStore((s) => s.autoCollapseSidebar);
  const setAutoCollapse = useUISettingsStore((s) => s.setAutoCollapseSidebar);

  const activeTheme = currentTheme ?? storeTheme;

  function handleThemeChange(value: Theme) {
    setStoreTheme(value);
    setNextTheme(value);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.theme")}</CardTitle>
          <CardDescription>{t("appearance.themeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={activeTheme === value ? "default" : "outline"}
                size="sm"
                className={cn("gap-2", activeTheme === value && "pointer-events-none")}
                onClick={() => handleThemeChange(value)}
              >
                <Icon className="h-4 w-4" />
                {t(`appearance.${value}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.sidebar")}</CardTitle>
          <CardDescription>{t("appearance.sidebarDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-collapse" className="flex flex-col gap-1">
              <span>{t("appearance.autoCollapse")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("appearance.autoCollapseDesc")}
              </span>
            </Label>
            <Switch id="auto-collapse" checked={autoCollapse} onCheckedChange={setAutoCollapse} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
