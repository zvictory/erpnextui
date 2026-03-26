"use client";

import { useTranslations } from "next-intl";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import type { DateFormat, NumberFormat, Locale } from "@/stores/ui-settings-store";
import { formatDate, formatNumber } from "@/lib/formatters";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "yyyy-MM-dd", label: "2026-03-05" },
  { value: "dd/MM/yyyy", label: "05/03/2026" },
  { value: "MM/dd/yyyy", label: "03/05/2026" },
  { value: "dd MMM yyyy", label: "05 Mar 2026" },
  { value: "MMM dd, yyyy", label: "Mar 05, 2026" },
];

const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: "1,234.56", label: "1,234.56 (US/UK)" },
  { value: "1.234,56", label: "1.234,56 (Europe)" },
  { value: "1 234,56", label: "1 234,56 (Russia/CIS)" },
];

const LANGUAGE_OPTIONS: { value: Locale; flag: string }[] = [
  { value: "ru", flag: "🇷🇺" },
  { value: "en", flag: "🇺🇸" },
  { value: "uz", flag: "🇺🇿" },
  { value: "uzc", flag: "🇺🇿" },
];

export function RegionalTab() {
  const t = useTranslations("settings");
  const dateFormat = useUISettingsStore((s) => s.dateFormat);
  const setDateFormat = useUISettingsStore((s) => s.setDateFormat);
  const numberFormat = useUISettingsStore((s) => s.numberFormat);
  const setNumberFormat = useUISettingsStore((s) => s.setNumberFormat);
  const locale = useUISettingsStore((s) => s.locale);
  const setLocale = useUISettingsStore((s) => s.setLocale);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("regional.language")}</CardTitle>
          <CardDescription>{t("regional.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <Label htmlFor="language" className="shrink-0 w-24">
              {t("regional.format")}
            </Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger id="language" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.flag} {t(`languages.${l.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("regional.dateFormat")}</CardTitle>
          <CardDescription>{t("regional.dateFormatDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <Label htmlFor="date-format" className="shrink-0 w-24">
              {t("regional.format")}
            </Label>
            <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
              <SelectTrigger id="date-format" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("regional.preview")}:{" "}
            <span className="font-medium text-foreground">{formatDate("2026-03-05")}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("regional.numberFormat")}</CardTitle>
          <CardDescription>{t("regional.numberFormatDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <Label htmlFor="number-format" className="shrink-0 w-24">
              {t("regional.format")}
            </Label>
            <Select value={numberFormat} onValueChange={(v) => setNumberFormat(v as NumberFormat)}>
              <SelectTrigger id="number-format" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("regional.preview")}:{" "}
            <span className="font-medium text-foreground">{formatNumber(1234567.89, 2)}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
