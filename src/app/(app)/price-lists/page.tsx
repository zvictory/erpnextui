"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PriceListPanel, type TypeFilter } from "@/components/price-lists/price-list-panel";
import { PriceListDetail } from "@/components/price-lists/price-list-detail";
import { PriceListFormDialog } from "@/components/price-lists/price-list-form-dialog";
import { usePriceListList, usePriceListCount, useDeletePriceList } from "@/hooks/use-price-lists";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import type { PriceListListItem } from "@/types/price-list";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function PriceListsPage() {
  const t = useTranslations("priceLists");
  const listState = useListState("price_list_name asc");
  const isMobile = useIsMobile();
  const { canCreate } = usePermissions();

  // Type filter
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Data
  const { data: priceLists = [], isLoading } = usePriceListList(
    listState.page,
    listState.debouncedSearch,
    listState.sort,
    typeFilter,
  );
  const { data: totalCount = 0 } = usePriceListCount(listState.debouncedSearch, typeFilter);

  // Selection
  const [selectedPriceList, setSelectedPriceList] = useState<PriceListListItem | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Form dialog
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const deletePriceList = useDeletePriceList();

  // Derive effective selection — auto-pick first item if nothing is selected yet
  const effectiveSelectedPriceList =
    selectedPriceList ?? (priceLists.length > 0 ? priceLists[0] : null);

  function handleSelect(pl: PriceListListItem) {
    setSelectedPriceList(pl);
    if (isMobile) setMobileSheetOpen(true);
  }

  function handleNew() {
    setEditingName(null);
    setFormDialogOpen(true);
  }

  function handleEdit() {
    if (effectiveSelectedPriceList) {
      setEditingName(effectiveSelectedPriceList.name);
      setFormDialogOpen(true);
    }
  }

  function handleDelete() {
    if (effectiveSelectedPriceList) {
      setDeleteTarget(effectiveSelectedPriceList.name);
    }
  }

  function handleFormSuccess(name: string) {
    const match = priceLists.find((pl) => pl.name === name);
    if (match) setSelectedPriceList(match);
  }

  return (
    <>
      {/* Two-pane container */}
      <div className="flex overflow-hidden -m-4 md:-m-6 h-[calc(100svh-3.5rem)]">
        {/* LEFT PANE */}
        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col border-r overflow-hidden">
          <PriceListPanel
            priceLists={priceLists}
            isLoading={isLoading}
            search={listState.search}
            onSearchChange={listState.setSearch}
            selectedName={effectiveSelectedPriceList?.name ?? null}
            onSelect={handleSelect}
            page={listState.page}
            totalCount={totalCount}
            pageSize={listState.pageSize}
            onNextPage={listState.nextPage}
            onPrevPage={listState.prevPage}
            canCreate={canCreate("Price List")}
            onNew={handleNew}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />
        </div>

        {/* RIGHT PANE — desktop only */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {effectiveSelectedPriceList ? (
            <PriceListDetail
              priceList={effectiveSelectedPriceList}
              onEdit={handleEdit}
              onDelete={handleDelete}
              className="w-full"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {t("selectToView")}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE SHEET */}
      {effectiveSelectedPriceList && (
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col p-0">
            <PriceListDetail
              priceList={effectiveSelectedPriceList}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </SheetContent>
        </Sheet>
      )}

      <PriceListFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editName={editingName}
        onSuccess={handleFormSuccess}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${t("delete")} ${t("priceList")}`}
        description={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.`}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={deletePriceList.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePriceList.mutate(deleteTarget, {
            onSuccess: () => {
              toast.success(t("deleteSuccess"));
              setDeleteTarget(null);
              if (effectiveSelectedPriceList?.name === deleteTarget) {
                setSelectedPriceList(null);
              }
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </>
  );
}
