"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getQuotationColumns } from "@/components/quotations/quotation-columns";
import {
  useQuotationList,
  useQuotationCount,
  useSubmitQuotation,
  useCancelQuotation,
  useDeleteQuotation,
} from "@/hooks/use-quotations";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import type { QuotationListItem } from "@/types/quotation";

export default function QuotationsPage() {
  const t = useTranslations("quotations");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("transaction_date desc,creation desc");

  const { data: quotations = [], isLoading } = useQuotationList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useQuotationCount(company, listState.debouncedSearch);

  const { data: currencyMap } = useCurrencyMap();
  const { canCreate, canDelete, canSubmit, canCancel } = usePermissions();
  const submitQuotation = useSubmitQuotation();
  const cancelQuotation = useCancelQuotation();
  const deleteQuotation = useDeleteQuotation();

  const [confirmAction, setConfirmAction] = useState<{
    type: "submit" | "cancel" | "delete";
    name: string;
  } | null>(null);

  const columns = getQuotationColumns(
    {
      onSubmit: (name) => setConfirmAction({ type: "submit", name }),
      onCancel: (name) => setConfirmAction({ type: "cancel", name }),
      onDelete: (name) => setConfirmAction({ type: "delete", name }),
    },
    {
      canDelete: canDelete("Quotation"),
      canSubmit: canSubmit("Quotation"),
      canCancel: canCancel("Quotation"),
    },
    currencyMap,
    t,
  );

  function handleConfirm() {
    if (!confirmAction) return;
    const { type, name } = confirmAction;

    const mutation =
      type === "submit" ? submitQuotation : type === "cancel" ? cancelQuotation : deleteQuotation;

    mutation.mutate(name, {
      onSuccess: () => {
        toast.success(
          type === "submit"
            ? "Quotation submitted"
            : type === "cancel"
              ? "Quotation cancelled"
              : "Quotation deleted",
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
        {canCreate("Quotation") && (
          <Button onClick={() => router.push("/quotations/new")}>
            <Plus className="mr-1 h-4 w-4" />
            {t("newQuotation")}
          </Button>
        )}
      </div>

      <DataTable<QuotationListItem>
        columns={columns}
        data={quotations}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchQuotations")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/quotations/${encodeURIComponent(row.name)}`)}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={config?.title ?? ""}
        description={config?.description ?? ""}
        confirmLabel={config?.label}
        variant={config?.variant}
        loading={
          submitQuotation.isPending || cancelQuotation.isPending || deleteQuotation.isPending
        }
        onConfirm={handleConfirm}
      />
    </div>
  );
}
