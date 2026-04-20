"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getMaintenanceLogs } from "@/actions/maintenance-logs";
import { formatDate, formatNumber } from "@/lib/formatters";

const TYPE_COLORS: Record<string, string> = {
  corrective: "text-red-600 bg-red-50 border-red-200",
  preventive: "text-blue-600 bg-blue-50 border-blue-200",
  calibration: "text-purple-600 bg-purple-50 border-purple-200",
  cleaning: "text-green-600 bg-green-50 border-green-200",
  capital: "text-amber-600 bg-amber-50 border-amber-200",
};

const STATUS_COLORS: Record<string, string> = {
  resolved: "text-emerald-600 bg-emerald-50 border-emerald-200",
  partially_resolved: "text-amber-600 bg-amber-50 border-amber-200",
  unresolved: "text-red-600 bg-red-50 border-red-200",
  needs_replacement: "text-purple-600 bg-purple-50 border-purple-200",
};

interface MaintenanceLogTableProps {
  assetId?: number;
}

export function MaintenanceLogTable({ assetId }: MaintenanceLogTableProps) {
  const t = useTranslations("maintenance");

  const { data: result, isLoading } = useQuery({
    queryKey: ["maintenanceLogs", { assetId }],
    queryFn: () => getMaintenanceLogs(assetId ? { assetId } : undefined),
  });

  const logs = result?.success ? result.data : [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noLogs")}</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            {!assetId && <TableHead>{t("asset")}</TableHead>}
            <TableHead>{t("type")}</TableHead>
            <TableHead>{t("mechanic")}</TableHead>
            <TableHead>{t("duration")}</TableHead>
            <TableHead>{t("resolution")}</TableHead>
            <TableHead className="text-right">{t("totalCost")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{formatDate(log.date)}</TableCell>
              {!assetId && (
                <TableCell>
                  <Link href={`/assets/${log.assetId}`} className="text-primary hover:underline">
                    {log.assetCode ?? log.assetName ?? `#${log.assetId}`}
                  </Link>
                </TableCell>
              )}
              <TableCell>
                <Badge variant="outline" className={TYPE_COLORS[log.maintenanceType] ?? ""}>
                  {t(`type.${log.maintenanceType}`)}
                </Badge>
              </TableCell>
              <TableCell>{log.mechanicName}</TableCell>
              <TableCell>
                {log.durationHours != null ? `${formatNumber(log.durationHours)} h` : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_COLORS[log.resolutionStatus] ?? ""}>
                  {t(`resolution.${log.resolutionStatus}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatNumber(log.totalCost ?? 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
