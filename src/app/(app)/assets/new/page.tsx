"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AssetForm } from "@/components/assets/asset-form";
import { createAsset } from "@/actions/assets";
import type { AssetFormValues } from "@/types/asset";

export default function NewAssetPage() {
  const t = useTranslations("assets");
  const router = useRouter();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: AssetFormValues) => createAsset(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t("assetCreated"));
        qc.invalidateQueries({ queryKey: ["assets"] });
        router.push(`/assets/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{t("newAsset")}</h1>
      <AssetForm onSubmit={(data) => mutation.mutate(data)} isSubmitting={mutation.isPending} />
    </div>
  );
}
