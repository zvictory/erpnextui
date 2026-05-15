"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText, Hammer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useItemActiveBom, useItemWorkOrders } from "@/hooks/use-items";
import { formatDate, formatNumber, formatCurrency } from "@/lib/formatters";
import { useCompanyStore } from "@/stores/company-store";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Completed":
      return "default";
    case "In Process":
      return "secondary";
    case "Not Started":
      return "outline";
    case "Stopped":
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

interface ManufacturingTabProps {
  itemCode: string;
}

export function ManufacturingTab({ itemCode }: ManufacturingTabProps) {
  const t = useTranslations("products.detail");
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  const { data: boms = [], isLoading: bomsLoading } = useItemActiveBom(itemCode);
  const { data: workOrders = [], isLoading: woLoading } = useItemWorkOrders(itemCode);

  return (
    <div className="space-y-6">
      {/* Active BOM section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {t("activeBom")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bomsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : boms.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{t("noBom")}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BOM</TableHead>
                    <TableHead className="text-right">{t("qty")}</TableHead>
                    <TableHead className="text-right">{t("amount")}</TableHead>
                    <TableHead className="text-center">{t("document")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boms.map((bom) => (
                    <TableRow key={bom.name}>
                      <TableCell>
                        <Link
                          href={`/manufacturing/bom/${encodeURIComponent(bom.name)}`}
                          className="text-primary font-mono text-xs hover:underline"
                        >
                          {bom.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(bom.quantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(bom.total_cost, currencySymbol, symbolOnRight)}
                      </TableCell>
                      <TableCell className="text-center">
                        {bom.is_default === 1 && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Orders section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hammer className="h-4 w-4" />
            {t("workOrders")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {woLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : workOrders.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{t("noWorkOrders")}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("document")}</TableHead>
                    <TableHead className="text-right">{t("planned")}</TableHead>
                    <TableHead className="text-right">{t("produced")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead className="text-center">{t("document")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((wo) => {
                    const progress = wo.qty > 0 ? Math.round((wo.produced_qty / wo.qty) * 100) : 0;
                    return (
                      <TableRow key={wo.name}>
                        <TableCell>
                          <Link
                            href={`/manufacturing/work-orders/${encodeURIComponent(wo.name)}`}
                            className="text-primary font-mono text-xs hover:underline"
                          >
                            {wo.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(wo.qty)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={progress} className="h-1.5 w-12" />
                            <span className="tabular-nums text-sm">
                              {formatNumber(wo.produced_qty)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(wo.planned_start_date)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusVariant(wo.status)}>{wo.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
