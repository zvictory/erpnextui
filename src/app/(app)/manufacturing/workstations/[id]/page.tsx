"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { WorkstationDetail } from "@/components/manufacturing/workstations/workstation-detail";
import { useWorkstation } from "@/hooks/use-manufacturing";

export default function WorkstationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const decodedId = decodeURIComponent(id);
  const t = useTranslations("mfg.workstations");
  const { data: workstation, isLoading } = useWorkstation(decodedId);

  if (isLoading) {
    return (
      <FormPageLayout title={t("title")} backHref="/manufacturing/workstations">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </FormPageLayout>
    );
  }

  if (!workstation) {
    return (
      <FormPageLayout title={t("title")} backHref="/manufacturing/workstations">
        <p className="text-muted-foreground">Workstation not found.</p>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title={workstation.workstation_name} backHref="/manufacturing/workstations">
      <WorkstationDetail workstation={workstation} />
    </FormPageLayout>
  );
}
