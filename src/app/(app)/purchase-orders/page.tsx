"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ListFiltersBar } from "@/components/shared/list-filters";
import { getPurchaseOrderColumns } from "@/components/purchase-orders/purchase-order-columns";
import {
  usePurchaseOrderList,
  usePurchaseOrderCount,
  useSubmitPurchaseOrder,
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
} from "@/hooks/use-purchase-orders";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { buildExtraFilters } from "@/lib/list-filter-utils";
import type { PurchaseOrderListItem } from "@/types/purchase-order";

export default function PurchaseOrdersPage() {
  const t = useTranslations("orders");
  const ts = useTranslations("status");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("transaction_date desc,creation desc");

  const extraFilters = useMemo(
    () => buildExtraFilters(listState.filters, "transaction_date"),
    [listState.filters],
  );

  const { data: orders = [], isLoading } = usePurchaseOrderList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
    extraFilters.length ? extraFilters : undefined,
  );
  const { data: totalCount = 0 } = usePurchaseOrderCount(
    company,
    listState.debouncedSearch,
    extraFilters.length ? extraFilters : undefined,
  );

  const { data: currencyMap } = useCurrencyMap();
  const { canCreate, canDelete, canSubmit, canCancel } = usePermissions();
  const submitOrder = useSubmitPurchaseOrder();
  const cancelOrder = useCancelPurchaseOrder();
  const deleteOrder = useDeletePurchaseOrder();

  const [confirmAction, setConfirmAction] = useState<{
    type: "submit" | "cancel" | "delete";
    name: string;
  } | null>(null);

  const columns = getPurchaseOrderColumns(
    {
      onSubmit: (name) => setConfirmAction({ type: "submit", name }),
      onCancel: (name) => setConfirmAction({ type: "cancel", name }),
      onDelete: (name) => setConfirmAction({ type: "delete", name }),
    },
    {
      canDelete: canDelete("Purchase Order"),
      canSubmit: canSubmit("Purchase Order"),
      canCancel: canCancel("Purchase Order"),
    },
    currencyMap,
    t,
  );

  function handleConfirm() {
    if (!confirmAction) return;
    const { type, name } = confirmAction;

    const mutation =
      type === "submit" ? submitOrder : type === "cancel" ? cancelOrder : deleteOrder;

    mutation.mutate(name, {
      onSuccess: () => {
        toast.success(
          type === "submit"
            ? "Order submitted"
            : type === "cancel"
              ? "Order cancelled"
              : "Order deleted",
        );
        setConfirmAction(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  const confirmConfig = {
    submit: {
      title: t("submit"),
      description: `Submit "${confirmAction?.name}"? Once submitted, it cannot be edited.`,
      label: t("submit"),
      variant: "default" as const,
    },
    cancel: {
      title: t("cancelOrder"),
      description: `Cancel "${confirmAction?.name}"? This action can be amended later.`,
      label: t("cancelOrder"),
      variant: "destructive" as const,
    },
    delete: {
      title: t("delete"),
      description: `Delete "${confirmAction?.name}"? This action cannot be undone.`,
      label: t("delete"),
      variant: "destructive" as const,
    },
  };

  const config = confirmAction ? confirmConfig[confirmAction.type] : null;

  const statusOptions = [
    { label: ts("draft"), value: "Draft" },
    { label: t("toReceiveAndBill"), value: "To Receive and Bill" },
    { label: t("toReceive"), value: "To Receive" },
    { label: t("toBill"), value: "To Bill" },
    { label: ts("completed"), value: "Completed" },
    { label: ts("cancelled"), value: "Cancelled" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("purchaseOrders")}</h1>
        {canCreate("Purchase Order") && (
          <Button onClick={() => router.push("/purchase-orders/new")}>
            <Plus className="mr-1 h-4 w-4" />
            {t("newPurchaseOrder")}
          </Button>
        )}
      </div>

      <DataTable<PurchaseOrderListItem>
        columns={columns}
        data={orders}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchOrders")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/purchase-orders/${encodeURIComponent(row.name)}`)}
        filterBar={
          <ListFiltersBar
            filters={listState.filters}
            onFilterChange={listState.setFilter}
            onClear={listState.clearFilters}
            statusOptions={statusOptions}
            showDateRange
          />
        }
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={config?.title ?? ""}
        description={config?.description ?? ""}
        confirmLabel={config?.label}
        variant={config?.variant}
        loading={submitOrder.isPending || cancelOrder.isPending || deleteOrder.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
