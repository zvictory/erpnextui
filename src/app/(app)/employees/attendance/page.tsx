"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeesTabelView } from "@/components/attendance/views/employees-tabel-view";
import { EmployeesDashboardView } from "@/components/attendance/views/employees-dashboard-view";

type AttendanceView = "tabel" | "dashboard";

export default function AttendancePage() {
  const t = useTranslations("employees");
  const [view, setView] = useState<AttendanceView>("tabel");

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b">
        <Tabs value={view} onValueChange={(v) => setView(v as AttendanceView)}>
          <TabsList>
            <TabsTrigger value="tabel">{t("view.tabel")}</TabsTrigger>
            <TabsTrigger value="dashboard">{t("view.dashboard")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="ghost" size="icon" asChild title={t("attendanceSettings")}>
          <Link href="/employees/attendance-settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="p-4 md:p-6">
        {view === "tabel" && <EmployeesTabelView />}
        {view === "dashboard" && <EmployeesDashboardView />}
      </div>
    </>
  );
}
