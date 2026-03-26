import Link from "next/link";
import { Plus } from "lucide-react";

import { getProductionRuns } from "@/actions/production";
import { getLines } from "@/actions/lines";
import { Button } from "@/components/ui/button";
import { columns } from "@/components/manufacturing/production/columns";
import { ProductionTable } from "@/components/manufacturing/production/production-table";

export default async function ProductionPage() {
  const [runsResult, linesResult] = await Promise.all([
    getProductionRuns(),
    getLines(),
  ]);

  const runs = runsResult.success ? runsResult.data : [];
  const lines = linesResult.success
    ? linesResult.data.map((l) => ({ id: l.id, name: l.name }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Log</h1>
          <p className="text-muted-foreground">
            Track and manage production runs across all lines.
          </p>
        </div>
        <Button asChild>
          <Link href="/manufacturing/production/new">
            <Plus className="mr-2 size-4" />
            New Run
          </Link>
        </Button>
      </div>

      <ProductionTable columns={columns} data={runs} lines={lines} />
    </div>
  );
}
