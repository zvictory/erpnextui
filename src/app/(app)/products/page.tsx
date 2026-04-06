"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Download, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getProductColumns } from "@/components/products/product-columns";
import { useItemList, useItemCount, useDeleteItem, useItemStockTotals } from "@/hooks/use-items";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanyStore } from "@/stores/company-store";
import { frappe } from "@/lib/frappe-client";
import { exportToExcel } from "@/lib/utils/export-excel";
import { formatNumber } from "@/lib/formatters";
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

  const itemCodes = useMemo(() => items.map((i) => i.item_code), [items]);
  const { data: stockMap } = useItemStockTotals(itemCodes);

  const columns = getProductColumns(
    currencySymbol,
    symbolOnRight,
    setDeleteTarget,
    canDelete("Item"),
    t,
    stockMap,
  );

  const [isExporting, setIsExporting] = useState(false);

  const exportColumns = useMemo(
    () => [
      { header: t("itemCode"), key: "item_code", width: 20 },
      { header: t("itemName"), key: "item_name", width: 35 },
      { header: t("itemGroup"), key: "item_group", width: 20 },
      { header: t("rate"), key: "standard_rate", width: 15 },
      { header: t("stock"), key: "stock_qty", width: 12 },
    ],
    [t],
  );

  const buildExportRows = useCallback(
    (rows: ItemListItem[], stock?: Map<string, number>) =>
      rows.map((r) => ({
        item_code: r.item_code,
        item_name: r.item_name,
        item_group: r.item_group,
        standard_rate: r.standard_rate,
        stock_qty: stock?.get(r.item_code) ?? 0,
      })),
    [],
  );

  const handleExportPage = useCallback(() => {
    exportToExcel(
      buildExportRows(items, stockMap),
      exportColumns,
      `Products-Page-${listState.page}`,
      "Products",
    );
  }, [items, stockMap, exportColumns, buildExportRows, listState.page]);

  const handleExportAll = useCallback(async () => {
    setIsExporting(true);
    try {
      const allItems = await frappe.getList<ItemListItem>("Item", {
        fields: ["name", "item_code", "item_name", "item_group", "standard_rate", "has_serial_no", "disabled"],
        orderBy: listState.sort || "item_code asc",
        limitPageLength: 0,
      });
      // Fetch all bins (no item_code filter to avoid 414 URI Too Large on large catalogs)
      const bins = await frappe.getList<{ item_code: string; actual_qty: number }>("Bin", {
        fields: ["item_code", "actual_qty"],
        limitPageLength: 0,
      });
      const allStock = new Map<string, number>();
      for (const b of bins) {
        allStock.set(b.item_code, (allStock.get(b.item_code) ?? 0) + b.actual_qty);
      }
      exportToExcel(
        buildExportRows(allItems, allStock),
        exportColumns,
        "Products-All",
        "Products",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [listState.sort, exportColumns, buildExportRows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Download className="mr-1 size-4" />
                )}
                Excel
                <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPage} disabled={items.length === 0}>
                {t("exportCurrentPage")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAll}>
                {t("exportFullList")} ({formatNumber(totalCount, 0)})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreate("Item") && (
            <Button onClick={() => router.push("/products/new")}>
              <Plus className="mr-1 h-4 w-4" />
              {t("newProduct")}
            </Button>
          )}
        </div>
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
