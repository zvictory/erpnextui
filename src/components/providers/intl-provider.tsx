"use client";

import { NextIntlClientProvider } from "next-intl";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uz from "../../../messages/uz.json";
import uzc from "../../../messages/uzc.json";

const MESSAGES = { en, ru, uz, uzc };

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = useUISettingsStore((s) => s.locale);
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      onError={(err) => {
        // Suppress ENVIRONMENT_FALLBACK during SSR pre-render; translations
        // will be correct on the client after hydration.
        if (err.code === "ENVIRONMENT_FALLBACK") return;
        console.error(err);
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
