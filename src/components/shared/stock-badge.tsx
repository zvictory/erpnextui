"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StockBadgeProps {
  available: number;
  required: number;
  className?: string;
}

export function StockBadge({ available, required, className }: StockBadgeProps) {
  const t = useTranslations("workflow");
  const sufficient = available >= required;

  return (
    <Badge variant={sufficient ? "default" : "destructive"} className={cn("text-xs", className)}>
      {sufficient ? t("stockAvailable") : t("stockInsufficient")} ({available})
    </Badge>
  );
}
