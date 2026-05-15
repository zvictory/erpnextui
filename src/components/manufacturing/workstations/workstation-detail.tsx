"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Zap, Wrench, Home, Users } from "lucide-react";
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
import { formatNumber } from "@/lib/formatters";
import { useWorkstationStatus } from "@/hooks/use-manufacturing";
import { useCompanyStore } from "@/stores/company-store";
import type { Workstation } from "@/types/manufacturing";

interface WorkstationDetailProps {
  workstation: Workstation;
}

export function WorkstationDetail({ workstation }: WorkstationDetailProps) {
  const t = useTranslations("mfg.workstations");
  const company = useCompanyStore((s) => s.company);
  const { data: allActiveJobs = [] } = useWorkstationStatus(company);

  const activeJobs = allActiveJobs.filter((jc) => jc.workstation === workstation.name);

  const rateRows = [
    {
      key: "labour",
      icon: <Users className="h-4 w-4 text-blue-500" />,
      label: t("labour"),
      value: workstation.hour_rate_labour,
    },
    {
      key: "electricity",
      icon: <Zap className="h-4 w-4 text-yellow-500" />,
      label: t("electricity"),
      value: workstation.hour_rate_electricity,
    },
    {
      key: "consumable",
      icon: <Wrench className="h-4 w-4 text-orange-500" />,
      label: t("consumable"),
      value: workstation.hour_rate_consumable,
    },
    {
      key: "rent",
      icon: <Home className="h-4 w-4 text-purple-500" />,
      label: t("rent"),
      value: workstation.hour_rate_rent,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hour Rate Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t("hourRate")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">{t("type")}</TableHead>
                <TableHead className="text-right">{t("hourRate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.icon}
                      <span>{row.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.value, 2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>{t("totalRate")}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(workstation.hour_rate, 2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Job Cards */}
      <Card>
        <CardHeader>
          <CardTitle>{t("activeJobCards")}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noActiveJobs")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Card</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeJobs.map((jc) => {
                  const pct =
                    jc.for_quantity > 0
                      ? Math.round((jc.total_completed_qty / jc.for_quantity) * 100)
                      : 0;
                  return (
                    <TableRow key={jc.name}>
                      <TableCell>
                        <Link
                          href={`/manufacturing/job-cards/${encodeURIComponent(jc.name)}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {jc.name}
                        </Link>
                      </TableCell>
                      <TableCell>{jc.operation}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{jc.work_order}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="tabular-nums">
                          {formatNumber(jc.total_completed_qty)} / {formatNumber(jc.for_quantity)} (
                          {pct}%)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
