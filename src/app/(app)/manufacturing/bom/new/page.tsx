"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { BomForm } from "@/components/manufacturing/bom/bom-form";
import { useCreateBOM } from "@/hooks/use-manufacturing";
import type { BOMFormValues } from "@/lib/schemas/manufacturing-schemas";

export default function NewBOMPage() {
  const t = useTranslations("mfg.bom");
  const router = useRouter();
  const createBOM = useCreateBOM();

  function handleSubmit(data: BOMFormValues) {
    createBOM.mutate(data, {
      onSuccess: (bom) => {
        toast.success("BOM created");
        router.push(`/manufacturing/bom/${encodeURIComponent(bom.name)}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <FormPageLayout title={t("new")} backHref="/manufacturing/bom">
      <BomForm onSubmit={handleSubmit} isSubmitting={createBOM.isPending} />
    </FormPageLayout>
  );
}
