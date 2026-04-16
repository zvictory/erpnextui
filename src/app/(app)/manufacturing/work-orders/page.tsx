"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { KanbanBoard } from "@/components/manufacturing/work-orders/kanban-board";
import { getWorkOrderColumns } from "@/components/manufacturing/work-orders/work-order-columns";
import { WoTabelDialog } from "@/components/manufacturing/work-orders/wo-tabel-dialog";
import { useWorkOrderList, useWorkOrderCount, useWorkOrder } from "@/hooks/use-manufacturing";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import { useManufacturingStore } from "@/stores/manufacturing-store";
import type { WorkOrderListItem } from "@/types/manufacturing";

export default function WorkOrdersPage() {
  const t = useTranslations("mfg.workOrders");
  const router = useRouter();
  const { company } = useCompanyStore();
  const { woViewMode, setWoViewMode } = useManufacturingStore();
  const listState = useListState("planned_start_date desc");
  const [tabelWO, setTabelWO] = useState<string | null>(null);
  const { data: tabelWorkOrder } = useWorkOrder(tabelWO ?? "");

  const { data: workOrders = [], isLoading } = useWorkOrderList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useWorkOrderCount(company, listState.debouncedSearch);

  const columns = getWorkOrderColumns(t, {
    onLaborClick: (row) => setTabelWO(row.name),
  });

  function handleRowClick(row: WorkOrderListItem) {
    router.push(`/manufacturing/work-orders/${encodeURIComponent(row.name)}`);
  }

  const toolbar = (
    <div className="flex items-center gap-2">
      {/* View toggle */}
      <div className="flex rounded-md border">
        <Button
          variant={woViewMode === "table" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-r-none"
          onClick={() => setWoViewMode("table")}
        >
          <Table2 className="h-4 w-4" />
        </Button>
        <Button
          variant={woViewMode === "kanban" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-l-none"
          onClick={() => setWoViewMode("kanban")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      <Button onClick={() => router.push("/manufacturing/work-orders/new")}>
        <Plus className="mr-1 h-4 w-4" />
        {t("new")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      {woViewMode === "table" ? (
        <DataTable<WorkOrderListItem>
          columns={columns}
          data={workOrders}
          isLoading={isLoading}
          search={listState.search}
          onSearchChange={listState.setSearch}
          searchPlaceholder={t("search")}
          sort={listState.sort}
          onSortChange={listState.setSort}
          page={listState.page}
          pageSize={listState.pageSize}
          totalCount={totalCount}
          onNextPage={listState.nextPage}
          onPrevPage={listState.prevPage}
          toolbar={toolbar}
          onRowClick={handleRowClick}
        />
      ) : (
        <>
          {/* Search + toolbar for kanban mode */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t("search")}
                value={listState.search}
                onChange={(e) => listState.setSearch(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            {toolbar}
          </div>
          <KanbanBoard workOrders={workOrders} isLoading={isLoading} />
        </>
      )}

      {tabelWorkOrder && (
        <WoTabelDialog
          open={!!tabelWO}
          onOpenChange={(open) => {
            if (!open) setTabelWO(null);
          }}
          workOrder={tabelWorkOrder}
        />
      )}
    </div>
  );
}
