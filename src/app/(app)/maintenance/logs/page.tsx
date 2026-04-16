"use client";

import { useTranslations } from "next-intl";
import { MaintenanceLogTable } from "@/components/maintenance/maintenance-log-table";
import { MaintenanceLogDialog } from "@/components/maintenance/maintenance-log-dialog";

export default function MaintenanceLogsPage() {
  const t = useTranslations("maintenance");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("maintenanceLogs")}</h1>
        <MaintenanceLogDialog />
      </div>
      <MaintenanceLogTable />
    </div>
  );
}
