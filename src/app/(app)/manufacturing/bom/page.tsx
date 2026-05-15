"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { getBomColumns } from "@/components/manufacturing/bom/bom-columns";
import { useBOMList, useBOMCount } from "@/hooks/use-manufacturing";
import { useListState } from "@/hooks/use-list-state";
import type { BOMListItem } from "@/types/manufacturing";

export default function BOMListPage() {
  const t = useTranslations("mfg.bom");
  const router = useRouter();
  const listState = useListState("modified desc");

  const { data: boms = [], isLoading } = useBOMList(
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useBOMCount(listState.debouncedSearch);

  const columns = getBomColumns(t);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button onClick={() => router.push("/manufacturing/bom/new")}>
          <Plus className="mr-1 h-4 w-4" />
          {t("new")}
        </Button>
      </div>

      <DataTable<BOMListItem>
        columns={columns}
        data={boms}
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
        onRowClick={(row) => router.push(`/manufacturing/bom/${encodeURIComponent(row.name)}`)}
      />
    </div>
  );
}
