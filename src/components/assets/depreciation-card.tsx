"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateDepreciation } from "@/lib/utils/depreciation";
import { formatNumber } from "@/lib/formatters";
import type { Asset } from "@/types/asset";

export function DepreciationCard({ asset }: { asset: Asset }) {
  const t = useTranslations("assets");

  const info = useMemo(() => calculateDepreciation(asset), [asset]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t("depreciation")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("purchaseCost")}</p>
            <p className="font-medium">{formatNumber(asset.purchaseCost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("salvageValue")}</p>
            <p className="font-medium">{formatNumber(asset.salvageValue ?? 0)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("bookValue")}</p>
            <p className="font-semibold text-lg">{formatNumber(info.bookValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("monthlyDepreciation")}</p>
            <p className="font-medium">{formatNumber(info.monthlyDepreciation)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {info.monthsUsed} / {info.totalMonths} {t("months")}
            </span>
            <span>{Math.round(info.percentDepreciated)}%</span>
          </div>
          <Progress value={info.percentDepreciated} className="h-2" />
        </div>

        <p className="text-xs text-muted-foreground">
          {t("method")}: {t(`depMethod.${asset.depreciationMethod ?? "straight_line"}`)}
        </p>
      </CardContent>
    </Card>
  );
}
