"use client";

import { useItemBins } from "@/hooks/use-stock-ledger";
import { formatNumber } from "@/lib/formatters";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface StockAvailabilityIndicatorProps {
  itemCode: string;
  isStockItem?: boolean;
}

export function StockAvailabilityIndicator({
  itemCode,
  isStockItem,
}: StockAvailabilityIndicatorProps) {
  const t = useTranslations("invoices");
  const { data: bins, isLoading } = useItemBins(isStockItem ? itemCode : "");

  // Hide for non-stock items or while item doc is loading
  if (!isStockItem || !itemCode) return null;

  if (isLoading) {
    return <span className="text-xs text-muted-foreground animate-pulse">...</span>;
  }

  const totalQty = (bins ?? []).reduce((sum, b) => sum + b.actual_qty, 0);
  const availableQty = (bins ?? []).reduce(
    (sum, b) => sum + b.actual_qty - (b.reserved_qty ?? 0),
    0,
  );
  const hasReserved = totalQty !== availableQty;
  const isOversold = availableQty < 0;
  const nonZeroBins = (bins ?? []).filter((b) => b.actual_qty > 0);
  const hasStock = totalQty > 0;

  const triggerColor = isOversold
    ? "text-red-600 dark:text-red-400"
    : hasStock
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-amber-600 dark:text-amber-400";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`text-xs hover:underline cursor-pointer ${triggerColor}`}
        >
          {hasStock
            ? hasReserved
              ? `${t("stockTotal", { qty: formatNumber(totalQty) })} / ${formatNumber(availableQty)} avail`
              : t("stockTotal", { qty: formatNumber(totalQty) })
            : t("stockOut")}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <PopoverHeader>
          <PopoverTitle className="text-xs">{t("stockByWarehouse")}</PopoverTitle>
        </PopoverHeader>
        <div className="mt-2 space-y-1">
          {nonZeroBins.length > 0 ? (
            nonZeroBins.map((bin) => {
              const reserved = bin.reserved_qty ?? 0;
              const avail = bin.actual_qty - reserved;
              const binOversold = avail < 0;
              return (
                <div key={bin.warehouse} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate mr-2">{bin.warehouse}</span>
                  <span
                    className={`font-mono tabular-nums shrink-0 ${binOversold ? "text-red-600 dark:text-red-400" : ""}`}
                  >
                    {reserved > 0
                      ? `${formatNumber(bin.actual_qty)} / ${formatNumber(avail)}`
                      : formatNumber(bin.actual_qty)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">{t("stockOut")}</p>
          )}
          {nonZeroBins.length > 1 && (
            <>
              <Separator className="my-1" />
              <div className="flex justify-between text-xs font-medium">
                <span>{t("total")}</span>
                <span
                  className={`font-mono tabular-nums ${isOversold ? "text-red-600 dark:text-red-400" : ""}`}
                >
                  {hasReserved
                    ? `${formatNumber(totalQty)} / ${formatNumber(availableQty)}`
                    : formatNumber(totalQty)}
                </span>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
