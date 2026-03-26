"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getProductColumns } from "@/components/products/product-columns";
import { useItemList, useItemCount, useDeleteItem } from "@/hooks/use-items";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanyStore } from "@/stores/company-store";
import type { ItemListItem } from "@/types/item";

export default function ProductsPage() {
  const t = useTranslations("products");
  const router = useRouter();
  const { currencySymbol, symbolOnRight } = useCompanyStore();
  const listState = useListState("item_code asc");

  const { data: items = [], isLoading } = useItemList(
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useItemCount(listState.debouncedSearch);

  const { canCreate, canDelete } = usePermissions();
  const deleteItem = useDeleteItem();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const columns = getProductColumns(
    currencySymbol,
    symbolOnRight,
    setDeleteTarget,
    canDelete("Item"),
    t,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canCreate("Item") && (
          <Button onClick={() => router.push("/products/new")}>
            <Plus className="mr-1 h-4 w-4" />
            {t("newProduct")}
          </Button>
        )}
      </div>

      <DataTable<ItemListItem>
        columns={columns}
        data={items}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder="Search by item code..."
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/products/${encodeURIComponent(row.name)}`)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${t("delete")} ${t("product")}`}
        description={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.`}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={deleteItem.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteItem.mutate(deleteTarget, {
            onSuccess: () => {
              toast.success("Product deleted");
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
