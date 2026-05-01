"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeesSettingsPage } from "@/components/attendance/views/employees-settings-page";

export default function AttendanceSettingsPage() {
  const t = useTranslations("employees");
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{t("attendanceSettings")}</h1>
      </div>
      <EmployeesSettingsPage />
    </div>
  );
}
