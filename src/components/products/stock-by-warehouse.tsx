"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import { useCompanyStore } from "@/stores/company-store";
import type { BinEntry } from "@/types/stock-entry";

interface StockByWarehouseProps {
  bins: BinEntry[];
  isLoading: boolean;
}

export function StockByWarehouse({ bins, isLoading }: StockByWarehouseProps) {
  const t = useTranslations("products.detail");
  const tp = useTranslations("products");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const totalQty = bins.reduce((sum, b) => sum + b.actual_qty, 0);
  const totalReserved = bins.reduce((sum, b) => sum + (b.reserved_qty ?? 0), 0);
  const totalAvailable = Math.max(0, totalQty - totalReserved);
  const totalValue = bins.reduce((sum, b) => sum + b.stock_value, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("stockByWarehouse")}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tp("warehouse")}</TableHead>
              <TableHead className="text-right">{t("inStock")}</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">{tp("valuationRate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-5 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : bins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  {t("noTransactions")}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {bins.map((bin) => {
                  const reserved = bin.reserved_qty ?? 0;
                  const available = Math.max(0, bin.actual_qty - reserved);
                  return (
                    <TableRow key={bin.warehouse}>
                      <TableCell className="font-medium">{bin.warehouse}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(bin.actual_qty)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {reserved > 0 ? formatNumber(reserved) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">
                        {formatNumber(available)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(bin.valuation_rate, currencySymbol, symbolOnRight)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total row */}
                <TableRow className="font-semibold">
                  <TableCell>{t("totalStock")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(totalQty)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">
                    {totalReserved > 0 ? formatNumber(totalReserved) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">
                    {formatNumber(totalAvailable)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totalValue, currencySymbol, symbolOnRight)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
