"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Percent, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getItemPriceColumns } from "@/components/price-lists/item-price-columns";
import { ItemPriceFormDialog } from "@/components/price-lists/item-price-form-dialog";
import { BulkUpdateDialog } from "@/components/price-lists/bulk-update-dialog";
import { CsvImportDialog } from "@/components/price-lists/csv-import-dialog";
import {
  useItemPricesByList,
  useItemPriceCountByList,
  useDeleteItemPrice,
} from "@/hooks/use-price-lists";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import type { PriceListListItem, ItemPrice } from "@/types/price-list";

interface PriceListDetailProps {
  priceList: PriceListListItem;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function PriceListDetail({ priceList, onEdit, onDelete, className }: PriceListDetailProps) {
  const t = useTranslations("priceLists");
  const listState = useListState("item_code asc");
  const { canCreate, canDelete } = usePermissions();

  const { data: itemPrices = [], isLoading } = useItemPricesByList(
    priceList.name,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useItemPriceCountByList(
    priceList.name,
    listState.debouncedSearch,
  );

  // Item price form dialog state
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPrice | null>(null);

  // Delete item price state
  const [deleteTarget, setDeleteTarget] = useState<ItemPrice | null>(null);
  const deleteItemPrice = useDeleteItemPrice();

  // Bulk update dialog
  const [bulkOpen, setBulkOpen] = useState(false);

  // CSV import dialog
  const [csvOpen, setCsvOpen] = useState(false);

  const columns = useMemo(
    () =>
      getItemPriceColumns(
        (item) => {
          setEditingItem(item);
          setItemFormOpen(true);
        },
        (item) => setDeleteTarget(item),
        canDelete("Item Price"),
        t,
      ),
    [canDelete, t],
  );

  function handleNewItemPrice() {
    setEditingItem(null);
    setItemFormOpen(true);
  }

  const toolbar = (
    <div className="flex gap-2">
      {canCreate("Item Price") && (
        <Button size="sm" onClick={handleNewItemPrice}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t("newItemPrice")}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
        <Percent className="h-3.5 w-3.5 mr-1" />
        {t("bulkUpdate")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
        <Upload className="h-3.5 w-3.5 mr-1" />
        {t("importCsv")}
      </Button>
    </div>
  );

  return (
    <div className={cn("flex flex-col overflow-auto", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">{priceList.price_list_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{priceList.currency}</span>
            {!!priceList.selling && (
              <Badge variant="outline" className="text-xs">
                {t("selling")}
              </Badge>
            )}
            {!!priceList.buying && (
              <Badge variant="outline" className="text-xs">
                {t("buying")}
              </Badge>
            )}
            {!priceList.enabled && (
              <Badge variant="secondary" className="text-xs text-red-600">
                Disabled
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            {t("edit")}
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            {t("delete")}
          </Button>
        </div>
      </div>

      {/* Item Prices DataTable */}
      <div className="flex-1 p-6">
        <DataTable
          columns={columns}
          data={itemPrices}
          isLoading={isLoading}
          search={listState.search}
          onSearchChange={listState.setSearch}
          searchPlaceholder={t("searchItemPrices")}
          sort={listState.sort}
          onSortChange={listState.setSort}
          page={listState.page}
          pageSize={listState.pageSize}
          totalCount={totalCount}
          onNextPage={listState.nextPage}
          onPrevPage={listState.prevPage}
          toolbar={toolbar}
          onRowClick={(row) => {
            setEditingItem(row);
            setItemFormOpen(true);
          }}
        />
      </div>

      {/* Dialogs */}
      <ItemPriceFormDialog
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        priceList={priceList}
        editItem={editingItem}
      />

      <BulkUpdateDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        priceListName={priceList.name}
        itemCount={totalCount}
      />

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} priceList={priceList} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${t("delete")} ${t("itemPrice")}`}
        description={`Delete price for "${deleteTarget?.item_code}"?`}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={deleteItemPrice.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteItemPrice.mutate(deleteTarget.name, {
            onSuccess: () => {
              toast.success(t("itemPriceDeleteSuccess"));
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
