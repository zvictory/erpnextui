"use client";

import { useTranslations } from "next-intl";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { WorkOrderForm } from "@/components/manufacturing/work-orders/work-order-form";

export default function NewWorkOrderPage() {
  const t = useTranslations("mfg.workOrders");

  return (
    <FormPageLayout title={t("new")} backHref="/manufacturing/work-orders">
      <WorkOrderForm />
    </FormPageLayout>
  );
}
