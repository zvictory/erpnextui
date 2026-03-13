"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/shared/data-table";
import { getSerialNumberColumns } from "@/components/serial-numbers/serial-columns";
import { useSerialNumberList, useSerialNumberCount } from "@/hooks/use-serial-numbers";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import type { SerialNumberListItem } from "@/types/serial-number";

export default function SerialNumbersPage() {
  const t = useTranslations("serialNumbers");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("creation desc");

  const { data: serials = [], isLoading } = useSerialNumberList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useSerialNumberCount(company, listState.debouncedSearch);

  const columns = getSerialNumberColumns(t);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      <DataTable<SerialNumberListItem>
        columns={columns}
        data={serials}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchPlaceholder")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/serial-numbers/${encodeURIComponent(row.name)}`)}
      />
    </div>
  );
}
