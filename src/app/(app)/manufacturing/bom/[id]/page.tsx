"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BomForm } from "@/components/manufacturing/bom/bom-form";
import { useBOM, useUpdateBOM } from "@/hooks/use-manufacturing";
import type { BOMFormValues } from "@/lib/schemas/manufacturing-schemas";

export default function EditBOMPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const t = useTranslations("mfg.bom");
  const router = useRouter();
  const { data: bom, isLoading } = useBOM(name);
  const updateBOM = useUpdateBOM();

  function handleSubmit(data: BOMFormValues) {
    updateBOM.mutate(
      { name, data },
      {
        onSuccess: () => {
          toast.success("BOM updated");
          router.push("/manufacturing/bom");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/manufacturing/bom">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="sr-only">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/manufacturing/bom">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">BOM Not Found</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="sr-only">BOM Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This Bill of Materials does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/manufacturing/bom">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">
          {bom.item_name} — {bom.name}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">{bom.item_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <BomForm
            defaultValues={bom}
            onSubmit={handleSubmit}
            isSubmitting={updateBOM.isPending}
            isEdit
          />
        </CardContent>
      </Card>
    </div>
  );
}
