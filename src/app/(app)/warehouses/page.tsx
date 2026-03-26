"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { useWarehouseList, useWarehouseCount } from "@/hooks/use-warehouses";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import type { WarehouseListItem } from "@/types/warehouse";
import type { ColumnDef } from "@/components/shared/data-table";

export default function WarehousesPage() {
  const router = useRouter();
  const t = useTranslations("stock");
  const { company } = useCompanyStore();
  const listState = useListState("warehouse_name asc");

  const { data: warehouses = [], isLoading } = useWarehouseList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useWarehouseCount(company, listState.debouncedSearch);

  const columns: ColumnDef<WarehouseListItem>[] = [
    {
      key: "warehouse_name",
      header: t("warehouseName"),
      sortKey: "warehouse_name",
      render: (row) => row.warehouse_name,
    },
    {
      key: "company",
      header: t("company"),
      render: (row) => row.company,
    },
    {
      key: "is_group",
      header: t("isGroup"),
      render: (row) => (row.is_group ? <Badge variant="secondary">{t("group")}</Badge> : null),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("warehouses")}</h1>

      <DataTable<WarehouseListItem>
        columns={columns}
        data={warehouses}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchWarehouses")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/warehouses/${encodeURIComponent(row.name)}`)}
      />
    </div>
  );
}
