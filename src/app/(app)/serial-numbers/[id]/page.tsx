"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { IMEIEditForm } from "@/components/serial-numbers/imei-edit-form";
import { useSerialNumber } from "@/hooks/use-serial-numbers";
import { Loader2 } from "lucide-react";

export default function SerialNumberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = decodeURIComponent(id);
  const t = useTranslations("serialNumbers");
  const { data: serial, isLoading } = useSerialNumber(name);

  if (isLoading) {
    return (
      <FormPageLayout title={t("detailTitle")} backHref="/serial-numbers">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </FormPageLayout>
    );
  }

  if (!serial) {
    return (
      <FormPageLayout title={t("detailTitle")} backHref="/serial-numbers">
        <p className="text-muted-foreground">Serial number not found.</p>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title={serial.name} backHref="/serial-numbers">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("detailTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">{t("serialNo")}</Label>
                <p className="font-medium">{serial.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("status")}</Label>
                <div className="mt-0.5">
                  <Badge
                    variant={
                      serial.status === "Active"
                        ? "default"
                        : serial.status === "Delivered"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {serial.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("item")}</Label>
                <p className="font-medium">
                  {serial.item_code}
                  {serial.item_name && serial.item_name !== serial.item_code && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      — {serial.item_name}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("warehouse")}</Label>
                <p className="font-medium">{serial.warehouse || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("imeiCodes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <IMEIEditForm
              serialName={serial.name}
              initialImei1={serial.custom_imei_1}
              initialImei2={serial.custom_imei_2}
            />
          </CardContent>
        </Card>
      </div>
    </FormPageLayout>
  );
}
