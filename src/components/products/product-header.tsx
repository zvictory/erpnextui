"use client";

import { useTranslations } from "next-intl";
import { Package, Tag, Ruler, CircleCheck, CircleX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import { useCompanyStore } from "@/stores/company-store";
import type { Item } from "@/types/item";

interface ProductHeaderProps {
  item: Item;
  totalStock: number;
}

export function ProductHeader({ item, totalStock }: ProductHeaderProps) {
  const t = useTranslations("products.detail");
  const tp = useTranslations("products");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const lastPurchaseRate = (item.last_purchase_rate as number) || 0;

  return (
    <div className="space-y-4">
      {/* Item identity */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{item.item_name}</h1>
        <p className="text-muted-foreground font-mono text-sm">{item.item_code}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary" className="gap-1">
            <Tag className="h-3 w-3" />
            {item.item_group}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Ruler className="h-3 w-3" />
            {item.stock_uom}
          </Badge>
          {item.disabled === 0 ? (
            <Badge
              variant="outline"
              className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
            >
              <CircleCheck className="h-3 w-3" />
              {tp("active")}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            >
              <CircleX className="h-3 w-3" />
              {tp("disabled")}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("totalStock")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              <Package className="mr-1.5 inline-block h-4 w-4 text-blue-500" />
              {formatNumber(totalStock)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {tp("valuationRate")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(item.valuation_rate, currencySymbol, symbolOnRight)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("standardRate")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(item.standard_rate, currencySymbol, symbolOnRight)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("lastPurchaseRate")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {lastPurchaseRate > 0
                ? formatCurrency(lastPurchaseRate, currencySymbol, symbolOnRight)
                : "\u2014"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
