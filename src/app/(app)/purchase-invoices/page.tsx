"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, type BulkAction } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ListFiltersBar } from "@/components/shared/list-filters";
import { getPurchaseInvoiceColumns } from "@/components/purchase-invoices/purchase-invoice-columns";
import {
  usePurchaseInvoiceList,
  usePurchaseInvoiceCount,
  useSubmitPurchaseInvoice,
  useCancelPurchaseInvoice,
  useDeletePurchaseInvoice,
} from "@/hooks/use-purchase-invoices";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { buildExtraFilters } from "@/lib/list-filter-utils";
import type { PurchaseInvoiceListItem } from "@/types/purchase-invoice";

export default function PurchaseInvoicesPage() {
  const t = useTranslations("invoices");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("posting_date desc,creation desc");

  const extraFilters = useMemo(
    () => buildExtraFilters(listState.filters, "posting_date"),
    [listState.filters],
  );

  const { data: invoices = [], isLoading } = usePurchaseInvoiceList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
    extraFilters.length ? extraFilters : undefined,
  );
  const { data: totalCount = 0 } = usePurchaseInvoiceCount(
    company,
    listState.debouncedSearch,
    extraFilters.length ? extraFilters : undefined,
  );

  const { data: currencyMap } = useCurrencyMap();
  const { canCreate, canDelete, canSubmit, canCancel } = usePermissions();
  const submitInvoice = useSubmitPurchaseInvoice();
  const cancelInvoice = useCancelPurchaseInvoice();
  const deleteInvoice = useDeletePurchaseInvoice();

  const [confirmAction, setConfirmAction] = useState<{
    type: "submit" | "cancel" | "delete";
    name: string;
  } | null>(null);

  const [bulkConfirm, setBulkConfirm] = useState<{
    type: "submit" | "cancel" | "delete";
    names: string[];
  } | null>(null);

  const columns = getPurchaseInvoiceColumns(
    {
      onSubmit: (name) => setConfirmAction({ type: "submit", name }),
      onCancel: (name) => setConfirmAction({ type: "cancel", name }),
      onDelete: (name) => setConfirmAction({ type: "delete", name }),
    },
    {
      canDelete: canDelete("Purchase Invoice"),
      canSubmit: canSubmit("Purchase Invoice"),
      canCancel: canCancel("Purchase Invoice"),
    },
    currencyMap,
    t,
  );

  function handleConfirm() {
    if (!confirmAction) return;
    const { type, name } = confirmAction;
    const mutation =
      type === "submit" ? submitInvoice : type === "cancel" ? cancelInvoice : deleteInvoice;

    mutation.mutate(name, {
      onSuccess: () => {
        toast.success(
          type === "submit"
            ? "Invoice submitted"
            : type === "cancel"
              ? "Invoice cancelled"
              : "Invoice deleted",
        );
        setConfirmAction(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  async function handleBulkConfirm() {
    if (!bulkConfirm) return;
    const { type, names } = bulkConfirm;
    const mutation =
      type === "submit" ? submitInvoice : type === "cancel" ? cancelInvoice : deleteInvoice;

    for (const name of names) {
      try {
        await mutation.mutateAsync(name);
      } catch (err) {
        toast.error(`${name}: ${(err as Error).message}`);
      }
    }
    toast.success(`${names.length} invoice(s) processed`);
    setBulkConfirm(null);
  }

  const confirmConfig = {
    submit: {
      title: t("submit") + " Invoice",
      description: `Submit "${confirmAction?.name}"? Once submitted, it cannot be edited.`,
      label: t("submit"),
      variant: "default" as const,
    },
    cancel: {
      title: t("cancelInvoice"),
      description: `Cancel "${confirmAction?.name}"? This action can be amended later.`,
      label: t("cancelInvoice"),
      variant: "destructive" as const,
    },
    delete: {
      title: t("delete") + " Invoice",
      description: `Delete "${confirmAction?.name}"? This action cannot be undone.`,
      label: t("delete"),
      variant: "destructive" as const,
    },
  };

  const config = confirmAction ? confirmConfig[confirmAction.type] : null;

  const statusOptions = [
    { label: ts("draft"), value: "Draft" },
    { label: ts("submitted"), value: "Submitted" },
    { label: ts("paid"), value: "Paid" },
    { label: ts("overdue"), value: "Overdue" },
    { label: ts("unpaid"), value: "Unpaid" },
    { label: ts("cancelled"), value: "Cancelled" },
    { label: ts("return"), value: "Return" },
  ];

  const bulkActions: BulkAction<PurchaseInvoiceListItem>[] = [
    ...(canSubmit("Purchase Invoice")
      ? [
          {
            label: tc("bulkSubmit"),
            onAction: (rows: PurchaseInvoiceListItem[]) =>
              setBulkConfirm({ type: "submit" as const, names: rows.map((r) => r.name) }),
          },
        ]
      : []),
    ...(canCancel("Purchase Invoice")
      ? [
          {
            label: tc("bulkCancel"),
            variant: "destructive" as const,
            onAction: (rows: PurchaseInvoiceListItem[]) =>
              setBulkConfirm({ type: "cancel" as const, names: rows.map((r) => r.name) }),
          },
        ]
      : []),
    ...(canDelete("Purchase Invoice")
      ? [
          {
            label: tc("bulkDelete"),
            variant: "destructive" as const,
            onAction: (rows: PurchaseInvoiceListItem[]) =>
              setBulkConfirm({ type: "delete" as const, names: rows.map((r) => r.name) }),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("purchaseInvoices")}</h1>
        {canCreate("Purchase Invoice") && (
          <Button onClick={() => router.push("/purchase-invoices/new")}>
            <Plus className="mr-1 h-4 w-4" />
            {t("newPurchaseInvoice")}
          </Button>
        )}
      </div>

      <DataTable<PurchaseInvoiceListItem>
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder="Search by supplier..."
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/purchase-invoices/${encodeURIComponent(row.name)}`)}
        filterBar={
          <ListFiltersBar
            filters={listState.filters}
            onFilterChange={listState.setFilter}
            onClear={listState.clearFilters}
            statusOptions={statusOptions}
            showDateRange
          />
        }
        bulkActions={bulkActions.length > 0 ? bulkActions : undefined}
        rowKey={(row) => row.name}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={config?.title ?? ""}
        description={config?.description ?? ""}
        confirmLabel={config?.label}
        variant={config?.variant}
        loading={submitInvoice.isPending || cancelInvoice.isPending || deleteInvoice.isPending}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        open={!!bulkConfirm}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
        title={`${bulkConfirm?.type === "submit" ? tc("bulkSubmit") : bulkConfirm?.type === "cancel" ? tc("bulkCancel") : tc("bulkDelete")}`}
        description={`Process ${bulkConfirm?.names.length ?? 0} invoice(s)?`}
        confirmLabel={tc("confirm")}
        variant={bulkConfirm?.type === "submit" ? "default" : "destructive"}
        loading={submitInvoice.isPending || cancelInvoice.isPending || deleteInvoice.isPending}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}
