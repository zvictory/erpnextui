"use client";

import { useTranslations } from "next-intl";
import { useCompanyStore } from "@/stores/company-store";
import {
  useProductionMetrics,
  useActiveWorkOrders,
  useRawMaterialStatus,
  useWorkstationStatus,
  useWorkstationList,
} from "@/hooks/use-manufacturing";
import { ProductionMetrics } from "@/components/manufacturing/erp-dashboard/production-metrics";
import { ProductionTimeline } from "@/components/manufacturing/erp-dashboard/production-timeline";
import { RawMaterialStatus } from "@/components/manufacturing/erp-dashboard/raw-material-status";
import { WorkstationStatus } from "@/components/manufacturing/erp-dashboard/workstation-status";

export default function ManufacturingDashboardPage() {
  const t = useTranslations("mfg.dashboard");
  const company = useCompanyStore((s) => s.company);

  const metrics = useProductionMetrics(company);
  const activeWOs = useActiveWorkOrders(company);
  const materials = useRawMaterialStatus(company);
  const activeJobs = useWorkstationStatus(company);
  const workstations = useWorkstationList(1, "", "workstation_name asc");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <ProductionMetrics data={metrics.data} isLoading={metrics.isLoading} />

      <ProductionTimeline data={activeWOs.data} isLoading={activeWOs.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RawMaterialStatus data={materials.data} isLoading={materials.isLoading} />
        <WorkstationStatus
          activeJobs={activeJobs.data}
          workstations={workstations.data}
          isLoading={activeJobs.isLoading || workstations.isLoading}
        />
      </div>
    </div>
  );
}
