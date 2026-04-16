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
import { formatNumber } from "@/lib/formatters";
import type { WorkOrderRequiredItem } from "@/types/manufacturing";

interface WoMaterialsTabProps {
  items: WorkOrderRequiredItem[];
}

export function WoMaterialsTab({ items }: WoMaterialsTabProps) {
  const t = useTranslations("mfg.workOrders");

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("materials")} --</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("productionItem")}</TableHead>
            <TableHead className="text-right">{t("required")}</TableHead>
            <TableHead className="text-right">{t("transferred")}</TableHead>
            <TableHead className="text-right">{t("consumed")}</TableHead>
            <TableHead className="text-right">{t("remaining")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const remaining = Math.max(0, item.required_qty - item.consumed_qty);
            return (
              <TableRow key={item.item_code}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.item_code}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.required_qty)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.transferred_qty)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.consumed_qty)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatNumber(remaining)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
