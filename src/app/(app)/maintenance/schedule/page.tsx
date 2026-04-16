"use client";

import { useTranslations } from "next-intl";
import { PreventiveScheduleList } from "@/components/maintenance/preventive-schedule-list";
import { PreventiveScheduleDialog } from "@/components/maintenance/preventive-schedule-dialog";

export default function MaintenanceSchedulePage() {
  const t = useTranslations("maintenance");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("preventiveSchedule")}</h1>
        <PreventiveScheduleDialog />
      </div>
      <PreventiveScheduleList />
    </div>
  );
}
