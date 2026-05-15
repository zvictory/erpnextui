"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/shared/data-table";
import { getWorkstationColumns } from "@/components/manufacturing/workstations/workstation-columns";
import { useWorkstationList, useWorkstationCount } from "@/hooks/use-manufacturing";
import { useListState } from "@/hooks/use-list-state";
import type { WorkstationListItem } from "@/types/manufacturing";

export default function WorkstationListPage() {
  const t = useTranslations("mfg.workstations");
  const router = useRouter();
  const listState = useListState("workstation_name asc");

  const { data: workstations = [], isLoading } = useWorkstationList(
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useWorkstationCount(listState.debouncedSearch);

  const columns = getWorkstationColumns(t);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      <DataTable<WorkstationListItem>
        columns={columns}
        data={workstations}
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
        onRowClick={(row) =>
          router.push(`/manufacturing/workstations/${encodeURIComponent(row.name)}`)
        }
      />
    </div>
  );
}
