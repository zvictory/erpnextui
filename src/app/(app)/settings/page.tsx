"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppearanceTab } from "@/components/settings/appearance-tab";
import { RegionalTab } from "@/components/settings/regional-tab";
import { InvoicesTab } from "@/components/settings/invoices-tab";
import { ConnectionTab } from "@/components/settings/connection-tab";

export default function SettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList>
          <TabsTrigger value="appearance">{t("tabs.appearance")}</TabsTrigger>
          <TabsTrigger value="regional">{t("tabs.regional")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="connection">{t("tabs.connection")}</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-4">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="regional" className="mt-4">
          <RegionalTab />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab />
        </TabsContent>

        <TabsContent value="connection" className="mt-4">
          <ConnectionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
