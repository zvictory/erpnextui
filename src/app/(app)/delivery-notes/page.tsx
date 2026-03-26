"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getDeliveryNoteColumns } from "@/components/delivery-notes/delivery-note-columns";
import {
  useDeliveryNoteList,
  useDeliveryNoteCount,
  useSubmitDeliveryNote,
  useCancelDeliveryNote,
  useDeleteDeliveryNote,
} from "@/hooks/use-delivery-notes";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import type { DeliveryNoteListItem } from "@/types/delivery-note";

export default function DeliveryNotesPage() {
  const t = useTranslations("deliveryNotes");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("posting_date desc,creation desc");

  const { data: notes = [], isLoading } = useDeliveryNoteList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useDeliveryNoteCount(company, listState.debouncedSearch);

  const { data: currencyMap } = useCurrencyMap();
  const { canCreate, canDelete, canSubmit, canCancel } = usePermissions();
  const submitNote = useSubmitDeliveryNote();
  const cancelNote = useCancelDeliveryNote();
  const deleteNote = useDeleteDeliveryNote();

  const [confirmAction, setConfirmAction] = useState<{
    type: "submit" | "cancel" | "delete";
    name: string;
  } | null>(null);

  const columns = getDeliveryNoteColumns(
    {
      onSubmit: (name) => setConfirmAction({ type: "submit", name }),
      onCancel: (name) => setConfirmAction({ type: "cancel", name }),
      onDelete: (name) => setConfirmAction({ type: "delete", name }),
    },
    {
      canDelete: canDelete("Delivery Note"),
      canSubmit: canSubmit("Delivery Note"),
      canCancel: canCancel("Delivery Note"),
    },
    currencyMap,
    t,
  );

  function handleConfirm() {
    if (!confirmAction) return;
    const { type, name } = confirmAction;

    const mutation = type === "submit" ? submitNote : type === "cancel" ? cancelNote : deleteNote;

    mutation.mutate(name, {
      onSuccess: () => {
        toast.success(
          type === "submit"
            ? "Delivery note submitted"
            : type === "cancel"
              ? "Delivery note cancelled"
              : "Delivery note deleted",
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
      title: t("cancel"),
      description: `Cancel "${confirmAction?.name}"? This action can be amended later.`,
      label: t("cancel"),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canCreate("Delivery Note") && (
          <Button onClick={() => router.push("/delivery-notes/new")}>
            <Plus className="mr-1 h-4 w-4" />
            {t("newDeliveryNote")}
          </Button>
        )}
      </div>

      <DataTable<DeliveryNoteListItem>
        columns={columns}
        data={notes}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchDeliveryNotes")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/delivery-notes/${encodeURIComponent(row.name)}`)}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={config?.title ?? ""}
        description={config?.description ?? ""}
        confirmLabel={config?.label}
        variant={config?.variant}
        loading={submitNote.isPending || cancelNote.isPending || deleteNote.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
