"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PartyTransactionsPane } from "@/components/shared/party-transactions-pane";
import { PartyDetailPanel } from "@/components/shared/party-detail-panel";
import { PartyListPanel } from "@/components/shared/party-list-panel";
import { PartyFormDialog } from "@/components/shared/party-form-dialog";
import { useSupplierList, useSupplierCount, useDeleteSupplier } from "@/hooks/use-suppliers";
import { usePayableBalances } from "@/hooks/use-party-balances";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanyStore } from "@/stores/company-store";
import type { SupplierWithBalance } from "@/types/supplier";

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

export default function VendorsPage() {
  const t = useTranslations("vendors");
  const listState = useListState("supplier_name asc");
  const { company } = useCompanyStore();
  const isMobile = useIsMobile();

  const { data: suppliers = [], isLoading } = useSupplierList(
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useSupplierCount(listState.debouncedSearch);

  const { balanceMap, isLoading: balancesLoading } = usePayableBalances(company);

  const suppliersWithBalance = useMemo<SupplierWithBalance[]>(
    () =>
      suppliers.map((s) => {
        const pb = balanceMap.get(s.name);
        return {
          ...s,
          outstanding_balance: pb?.totalInBaseCurrency ?? 0,
          currency_balances: pb?.balances ?? [],
        };
      }),
    [suppliers, balanceMap],
  );

  const { canCreate } = usePermissions();
  const deleteSupplier = useDeleteSupplier();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [selectedParty, setSelectedParty] = useState<SupplierWithBalance | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Form dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingPartyName, setEditingPartyName] = useState<string | null>(null);

  // Derive effective selection — auto-pick first item if nothing is selected yet
  const effectiveSelectedParty =
    selectedParty ?? (suppliersWithBalance.length > 0 ? suppliersWithBalance[0] : null);

  const handleSelect = (party: SupplierWithBalance) => {
    setSelectedParty(party);
    if (isMobile) setMobileSheetOpen(true);
  };

  const handleNew = () => {
    setEditingPartyName(null);
    setFormDialogOpen(true);
  };

  const handleEdit = () => {
    if (effectiveSelectedParty) {
      setEditingPartyName(effectiveSelectedParty.name);
      setFormDialogOpen(true);
    }
  };

  const handleDelete = () => {
    if (effectiveSelectedParty) {
      setDeleteTarget(effectiveSelectedParty.name);
    }
  };

  const handleFormSuccess = (name: string) => {
    // After create/update, try to select the party in the list
    // The list will refresh via query invalidation; we store the name to auto-select
    const match = suppliersWithBalance.find((s) => s.name === name);
    if (match) {
      setSelectedParty(match);
    }
  };

  const partyRows = suppliersWithBalance.map((s) => ({
    name: s.name,
    displayName: s.supplier_name,
    outstanding_balance: s.outstanding_balance,
    currency_balances: s.currency_balances,
    currency: s.default_currency,
  }));

  return (
    <>
      {/* Two-pane container — cancels parent padding */}
      <div className="flex overflow-hidden -m-4 md:-m-6 h-[calc(100svh-3.5rem)]">
        {/* LEFT PANE — 380px fixed */}
        <div className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-hidden">
          <PartyListPanel
            partyType="Supplier"
            parties={partyRows}
            isLoading={isLoading}
            balancesLoading={balancesLoading}
            search={listState.search}
            onSearchChange={listState.setSearch}
            selectedName={effectiveSelectedParty?.name ?? null}
            onSelect={(row) => {
              const full = suppliersWithBalance.find((s) => s.name === row.name);
              if (full) handleSelect(full);
            }}
            page={listState.page}
            totalCount={totalCount}
            pageSize={listState.pageSize}
            onNextPage={listState.nextPage}
            onPrevPage={listState.prevPage}
            canCreate={canCreate("Supplier")}
            onNew={handleNew}
          />
        </div>

        {/* RIGHT PANE — fills remaining (desktop only) */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {effectiveSelectedParty ? (
            <PartyDetailPanel
              partyType="Supplier"
              partyName={effectiveSelectedParty.name}
              partyDisplayName={effectiveSelectedParty.supplier_name}
              partyCurrency={effectiveSelectedParty.default_currency}
              outstandingBalance={effectiveSelectedParty.outstanding_balance}
              currencyBalances={effectiveSelectedParty.currency_balances}
              className="w-full"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {t("selectToView")}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE SHEET OVERLAY */}
      {effectiveSelectedParty && (
        <PartyTransactionsPane
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          partyType="Supplier"
          partyName={effectiveSelectedParty.name}
          partyDisplayName={effectiveSelectedParty.supplier_name}
          outstandingBalance={effectiveSelectedParty.outstanding_balance}
          currencyBalances={effectiveSelectedParty.currency_balances}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <PartyFormDialog
        partyType="Supplier"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editName={editingPartyName}
        onSuccess={handleFormSuccess}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${t("delete")} ${t("vendor")}`}
        description={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.`}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={deleteSupplier.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSupplier.mutate(deleteTarget, {
            onSuccess: () => {
              toast.success(t("deleteSuccess"));
              setDeleteTarget(null);
              if (effectiveSelectedParty?.name === deleteTarget) {
                setSelectedParty(null);
              }
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </>
  );
}
