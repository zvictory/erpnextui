"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AssetStatus } from "@/types/asset";

const statusConfig: Record<
  AssetStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  operational: {
    variant: "default",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  },
  maintenance: {
    variant: "secondary",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  broken: { variant: "destructive", className: "" },
  retired: { variant: "outline", className: "text-muted-foreground" },
};

export function AssetStatusBadge({ status }: { status: string | null }) {
  const t = useTranslations("assets");
  const s = (status ?? "operational") as AssetStatus;
  const config = statusConfig[s] ?? statusConfig.operational;

  return (
    <Badge variant={config.variant} className={config.className}>
      {t(`status.${s}`)}
    </Badge>
  );
}
