"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PartyTransactionsPane } from "@/components/shared/party-transactions-pane";
import { PartyDetailPanel } from "@/components/shared/party-detail-panel";
import { PartyListPanel } from "@/components/shared/party-list-panel";
import { PartyFormDialog } from "@/components/shared/party-form-dialog";
import { useCustomerList, useCustomerCount, useDeleteCustomer } from "@/hooks/use-customers";
import { useReceivableBalances } from "@/hooks/use-party-balances";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanyStore } from "@/stores/company-store";
import type { CustomerWithBalance } from "@/types/customer";

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

export default function CustomersPage() {
  const t = useTranslations("customers");
  const listState = useListState("customer_name asc");
  const { company } = useCompanyStore();
  const isMobile = useIsMobile();

  const { data: customers = [], isLoading } = useCustomerList(
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useCustomerCount(listState.debouncedSearch);

  const { balanceMap, isLoading: balancesLoading } = useReceivableBalances(company);

  const customersWithBalance = useMemo<CustomerWithBalance[]>(
    () =>
      customers.map((c) => {
        const pb = balanceMap.get(c.name);
        return {
          ...c,
          outstanding_balance: pb?.totalInBaseCurrency ?? 0,
          currency_balances: pb?.balances ?? [],
        };
      }),
    [customers, balanceMap],
  );

  const { canCreate } = usePermissions();
  const deleteCustomer = useDeleteCustomer();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [selectedParty, setSelectedParty] = useState<CustomerWithBalance | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Form dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingPartyName, setEditingPartyName] = useState<string | null>(null);

  // Derive effective selection — auto-pick first item if nothing is selected yet
  const effectiveSelectedParty =
    selectedParty ?? (customersWithBalance.length > 0 ? customersWithBalance[0] : null);

  const handleSelect = (party: CustomerWithBalance) => {
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
    const match = customersWithBalance.find((c) => c.name === name);
    if (match) {
      setSelectedParty(match);
    }
  };

  const partyRows = customersWithBalance.map((c) => ({
    name: c.name,
    displayName: c.customer_name,
    outstanding_balance: c.outstanding_balance,
    currency_balances: c.currency_balances,
    currency: c.default_currency,
    disabled: c.disabled,
  }));

  return (
    <>
      {/* Two-pane container — cancels parent padding */}
      <div className="flex overflow-hidden -m-4 md:-m-6 h-[calc(100svh-3.5rem)]">
        {/* LEFT PANE — 380px fixed */}
        <div className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-hidden">
          <PartyListPanel
            partyType="Customer"
            parties={partyRows}
            isLoading={isLoading}
            balancesLoading={balancesLoading}
            search={listState.search}
            onSearchChange={listState.setSearch}
            selectedName={effectiveSelectedParty?.name ?? null}
            onSelect={(row) => {
              const full = customersWithBalance.find((c) => c.name === row.name);
              if (full) handleSelect(full);
            }}
            page={listState.page}
            totalCount={totalCount}
            pageSize={listState.pageSize}
            onNextPage={listState.nextPage}
            onPrevPage={listState.prevPage}
            canCreate={canCreate("Customer")}
            onNew={handleNew}
          />
        </div>

        {/* RIGHT PANE — fills remaining (desktop only) */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {effectiveSelectedParty ? (
            <PartyDetailPanel
              partyType="Customer"
              partyName={effectiveSelectedParty.name}
              partyDisplayName={effectiveSelectedParty.customer_name}
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
          partyType="Customer"
          partyName={effectiveSelectedParty.name}
          partyDisplayName={effectiveSelectedParty.customer_name}
          partyCurrency={effectiveSelectedParty.default_currency}
          outstandingBalance={effectiveSelectedParty.outstanding_balance}
          currencyBalances={effectiveSelectedParty.currency_balances}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <PartyFormDialog
        partyType="Customer"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editName={editingPartyName}
        onSuccess={handleFormSuccess}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${t("delete")} ${t("customer")}`}
        description={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.`}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={deleteCustomer.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCustomer.mutate(deleteTarget, {
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
