"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/stores/company-store";
import { useManufactureEntries } from "@/hooks/use-manufacturing";
import { getProductionRuns } from "@/actions/production";
import { getLines } from "@/actions/lines";
import { Button } from "@/components/ui/button";
import { columns } from "@/components/manufacturing/production/columns";
import type { ProductionRow } from "@/components/manufacturing/production/columns";
import { ProductionTable } from "@/components/manufacturing/production/production-table";

export default function ProductionPage() {
  const { company } = useCompanyStore();

  // Local SQLite production runs
  const { data: localResult, isLoading: localLoading } = useQuery({
    queryKey: ["localProductionRuns"],
    queryFn: () => getProductionRuns(),
  });

  const { data: linesResult } = useQuery({
    queryKey: ["localProductionLines"],
    queryFn: () => getLines(),
  });

  // ERPNext manufacture stock entries
  const { data: erpEntries = [], isLoading: erpLoading } = useManufactureEntries(
    company,
    1,
    "",
    "posting_date desc",
  );

  // Merge both sources into unified rows sorted by date desc
  const mergedData = useMemo((): ProductionRow[] => {
    const rows: ProductionRow[] = [];

    // Local runs
    const localRuns = localResult?.success ? localResult.data : [];
    for (const run of localRuns) {
      rows.push({
        key: `local-${run.id}`,
        source: "local",
        date: run.date,
        itemCode: run.productCode ?? "",
        itemName: run.productName ?? "",
        qty: run.actualOutput,
        localId: run.id,
        shift: run.shift,
        lineName: run.lineName,
        totalHours: run.totalHours,
        productivity: run.productivity,
        efficiency: run.efficiency,
      });
    }

    // ERPNext entries
    for (const entry of erpEntries) {
      rows.push({
        key: `erp-${entry.name}`,
        source: "work-order",
        date: entry.posting_date,
        itemCode: entry.item_code,
        itemName: entry.item_name,
        qty: entry.qty,
        stockEntry: entry.name,
        workOrder: entry.work_order,
      });
    }

    // Sort by date descending
    rows.sort((a, b) => b.date.localeCompare(a.date));

    return rows;
  }, [localResult, erpEntries]);

  const lines = linesResult?.success
    ? linesResult.data.map((l) => ({ id: l.id, name: l.name }))
    : [];

  const isLoading = localLoading || erpLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production</h1>
          <p className="text-muted-foreground">
            Manual production runs and manufactured items from work orders.
          </p>
        </div>
        <Button asChild>
          <Link href="/manufacturing/production/new">
            <Plus className="mr-2 size-4" />
            New Run
          </Link>
        </Button>
      </div>

      <ProductionTable columns={columns} data={mergedData} lines={lines} isLoading={isLoading} />
    </div>
  );
}
