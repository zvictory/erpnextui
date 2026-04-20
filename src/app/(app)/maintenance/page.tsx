"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Wrench, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaintenanceLogTable } from "@/components/maintenance/maintenance-log-table";
import { MaintenanceLogDialog } from "@/components/maintenance/maintenance-log-dialog";
import { PreventiveScheduleList } from "@/components/maintenance/preventive-schedule-list";
import { getMaintenanceDashboardKPIs } from "@/actions/maintenance-logs";
import { getOverdueTasks } from "@/actions/preventive-schedule";
import { formatNumber } from "@/lib/formatters";

export default function MaintenanceDashboardPage() {
  const t = useTranslations("maintenance");

  const { data: kpiResult } = useQuery({
    queryKey: ["maintenanceKPIs"],
    queryFn: () => getMaintenanceDashboardKPIs(),
  });

  const { data: overdueResult } = useQuery({
    queryKey: ["overdueTasks"],
    queryFn: () => getOverdueTasks(),
  });

  const kpis = kpiResult?.success ? kpiResult.data : null;
  const overdueCount = overdueResult?.success ? overdueResult.data.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>
        <MaintenanceLogDialog />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("monthRepairs")}</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.monthRepairCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("monthDowntime")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(kpis?.monthDowntimeHours ?? 0)} h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("monthCost")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpis?.monthRepairCost ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("overdueTasks")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue preventive tasks */}
      {overdueCount > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-destructive">{t("overdueSchedule")}</h2>
          <PreventiveScheduleList />
        </div>
      )}

      {/* Recent maintenance logs */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t("recentLogs")}</h2>
        <MaintenanceLogTable />
      </div>
    </div>
  );
}
