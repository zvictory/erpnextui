"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type BulkAction } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ListFiltersBar } from "@/components/shared/list-filters";
import { getPaymentColumns } from "@/components/payments/payment-columns";
import {
  usePaymentEntryList,
  usePaymentEntryCount,
  useCancelPaymentEntry,
  useDeletePaymentEntry,
} from "@/hooks/use-payment-entries";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { buildExtraFilters } from "@/lib/list-filter-utils";
import type { PaymentEntryListItem } from "@/types/payment-entry";

export default function PaymentsPage() {
  const t = useTranslations("payments");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("posting_date desc,creation desc");

  const extraFilters = useMemo(
    () => buildExtraFilters(listState.filters, "posting_date"),
    [listState.filters],
  );

  const { data: payments = [], isLoading } = usePaymentEntryList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
    extraFilters.length ? extraFilters : undefined,
  );
  const { data: totalCount = 0 } = usePaymentEntryCount(
    company,
    listState.debouncedSearch,
    extraFilters.length ? extraFilters : undefined,
  );

  const { data: currencyMap } = useCurrencyMap();
  const { canCreate, canDelete, canCancel } = usePermissions();
  const cancelPayment = useCancelPaymentEntry();
  const deletePayment = useDeletePaymentEntry();

  const [confirmAction, setConfirmAction] = useState<{
    type: "cancel" | "delete";
    name: string;
  } | null>(null);

  const [bulkConfirm, setBulkConfirm] = useState<{
    type: "cancel" | "delete";
    names: string[];
  } | null>(null);

  const columns = getPaymentColumns(
    {
      onCancel: (name) => setConfirmAction({ type: "cancel", name }),
      onDelete: (name) => setConfirmAction({ type: "delete", name }),
    },
    {
      canDelete: canDelete("Payment Entry"),
      canCancel: canCancel("Payment Entry"),
    },
    currencyMap,
    t,
  );

  function handleConfirm() {
    if (!confirmAction) return;
    const { type, name } = confirmAction;
    const mutation = type === "cancel" ? cancelPayment : deletePayment;

    mutation.mutate(name, {
      onSuccess: () => {
        toast.success(type === "cancel" ? t("cancelled") : t("deleted"));
        setConfirmAction(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  async function handleBulkConfirm() {
    if (!bulkConfirm) return;
    const { type, names } = bulkConfirm;
    const mutation = type === "cancel" ? cancelPayment : deletePayment;

    for (const name of names) {
      try {
        await mutation.mutateAsync(name);
      } catch (err) {
        toast.error(`${name}: ${(err as Error).message}`);
      }
    }
    toast.success(`${names.length} payment(s) processed`);
    setBulkConfirm(null);
  }

  const confirmConfig = {
    cancel: {
      title: t("cancelPayment"),
      description: `Cancel "${confirmAction?.name}"? This action can be amended later.`,
      label: t("cancelPayment"),
      variant: "destructive" as const,
    },
    delete: {
      title: t("deletePayment"),
      description: `Delete "${confirmAction?.name}"? This action cannot be undone.`,
      label: t("deletePayment"),
      variant: "destructive" as const,
    },
  };

  const config = confirmAction ? confirmConfig[confirmAction.type] : null;

  const statusOptions = [
    { label: ts("draft"), value: "Draft" },
    { label: ts("submitted"), value: "Submitted" },
    { label: ts("cancelled"), value: "Cancelled" },
  ];

  const bulkActions: BulkAction<PaymentEntryListItem>[] = [
    ...(canCancel("Payment Entry")
      ? [
          {
            label: tc("bulkCancel"),
            variant: "destructive" as const,
            onAction: (rows: PaymentEntryListItem[]) =>
              setBulkConfirm({ type: "cancel" as const, names: rows.map((r) => r.name) }),
          },
        ]
      : []),
    ...(canDelete("Payment Entry")
      ? [
          {
            label: tc("bulkDelete"),
            variant: "destructive" as const,
            onAction: (rows: PaymentEntryListItem[]) =>
              setBulkConfirm({ type: "delete" as const, names: rows.map((r) => r.name) }),
          },
        ]
      : []),
  ];

  const toolbar = canCreate("Payment Entry") ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          {t("newPayment")}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push("/payments/receive")}>
          {t("receivePayment")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/payments/pay")}>
          {t("payBills")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("listTitle")}</h1>
      </div>

      <DataTable<PaymentEntryListItem>
        columns={columns}
        data={payments}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchPayments")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/payments/${encodeURIComponent(row.name)}`)}
        toolbar={toolbar}
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
        loading={cancelPayment.isPending || deletePayment.isPending}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        open={!!bulkConfirm}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
        title={bulkConfirm?.type === "cancel" ? tc("bulkCancel") : tc("bulkDelete")}
        description={`Process ${bulkConfirm?.names.length ?? 0} payment(s)?`}
        confirmLabel={tc("confirm")}
        variant="destructive"
        loading={cancelPayment.isPending || deletePayment.isPending}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}
