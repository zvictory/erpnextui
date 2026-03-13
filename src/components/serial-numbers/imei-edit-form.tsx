"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSerialNumber } from "@/hooks/use-serial-numbers";

interface IMEIEditFormProps {
  serialName: string;
  initialImei1?: string;
  initialImei2?: string;
}

export function IMEIEditForm({ serialName, initialImei1, initialImei2 }: IMEIEditFormProps) {
  const t = useTranslations("serialNumbers");
  const [imei1, setImei1] = useState(initialImei1 ?? "");
  const [imei2, setImei2] = useState(initialImei2 ?? "");
  const updateSerial = useUpdateSerialNumber();

  useEffect(() => {
    setImei1(initialImei1 ?? "");
    setImei2(initialImei2 ?? "");
  }, [initialImei1, initialImei2]);

  const hasChanges = imei1 !== (initialImei1 ?? "") || imei2 !== (initialImei2 ?? "");

  function handleSave() {
    updateSerial.mutate(
      { name: serialName, data: { custom_imei_1: imei1, custom_imei_2: imei2 } },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="imei1">{t("imei1")}</Label>
        <Input
          id="imei1"
          value={imei1}
          onChange={(e) => setImei1(e.target.value)}
          placeholder="350999999999999"
          maxLength={20}
          className="font-mono"
          disabled={updateSerial.isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="imei2">{t("imei2")}</Label>
        <Input
          id="imei2"
          value={imei2}
          onChange={(e) => setImei2(e.target.value)}
          placeholder="350999999999999"
          maxLength={20}
          className="font-mono"
          disabled={updateSerial.isPending}
        />
      </div>
      <Button onClick={handleSave} disabled={!hasChanges || updateSerial.isPending}>
        {updateSerial.isPending ? "Saving..." : t("save")}
      </Button>
    </div>
  );
}
