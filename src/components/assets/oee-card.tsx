"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rateOEE, oeeColor } from "@/lib/utils/oee";
import { getAssetOEEAverage } from "@/actions/oee";
import { formatNumber } from "@/lib/formatters";

export function OEECard({ assetId }: { assetId: number }) {
  const t = useTranslations("assets");

  const { data: result } = useQuery({
    queryKey: ["oeeAverage", assetId],
    queryFn: () => getAssetOEEAverage(assetId),
    enabled: !!assetId,
  });

  const avg = result?.success ? result.data : null;

  if (!avg) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">OEE</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noOEEData")}</p>
        </CardContent>
      </Card>
    );
  }

  const rating = rateOEE(avg.averageOEE);
  const colorClass = oeeColor(rating);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">OEE</CardTitle>
          <Badge variant="outline" className={colorClass}>
            {t(`oeeRating.${rating}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <p className="text-3xl font-bold">{formatNumber(avg.averageOEE)}%</p>
          <p className="text-xs text-muted-foreground">
            {avg.measurementCount} {t("measurements")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-muted-foreground text-xs">{t("availability")}</p>
            <p className="font-medium">{formatNumber(avg.averageAvailability)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("performance")}</p>
            <p className="font-medium">{formatNumber(avg.averagePerformance)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("quality")}</p>
            <p className="font-medium">{formatNumber(avg.averageQuality)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
