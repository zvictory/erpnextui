"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/shared/data-table";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useStockEntryList,
  useStockEntryCount,
  useCancelStockEntry,
  useDeleteStockEntry,
} from "@/hooks/use-stock-entries";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import { formatDate, formatNumber } from "@/lib/formatters";
import type { StockEntryListItem } from "@/types/stock-entry";
import type { ColumnDef } from "@/components/shared/data-table";

const TYPE_BADGES: Record<string, "default" | "secondary" | "outline"> = {
  "Material Receipt": "default",
  "Material Issue": "secondary",
  "Material Transfer": "outline",
};

export default function StockEntriesPage() {
  const router = useRouter();
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const { company } = useCompanyStore();
  const listState = useListState("posting_date desc");

  const { data: entries = [], isLoading } = useStockEntryList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useStockEntryCount(company, listState.debouncedSearch);

  const cancelEntry = useCancelStockEntry();
  const deleteEntry = useDeleteStockEntry();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function typeLabel(type: string) {
    if (type === "Material Receipt") return t("materialReceipt");
    if (type === "Material Issue") return t("materialIssue");
    if (type === "Material Transfer") return t("materialTransfer");
    return type;
  }

  const columns: ColumnDef<StockEntryListItem>[] = [
    {
      key: "name",
      header: "#",
      sortKey: "name",
      render: (row) => <span className="font-mono text-xs">{row.name}</span>,
    },
    {
      key: "stock_entry_type",
      header: t("entryType"),
      render: (row) => (
        <Badge variant={TYPE_BADGES[row.stock_entry_type] ?? "outline"}>
          {typeLabel(row.stock_entry_type)}
        </Badge>
      ),
    },
    {
      key: "posting_date",
      header: tc("date"),
      sortKey: "posting_date",
      render: (row) => formatDate(row.posting_date),
    },
    {
      key: "total_amount",
      header: t("totalAmount"),
      className: "text-right",
      sortKey: "total_amount",
      render: (row) => formatNumber(row.total_amount),
    },
    {
      key: "status",
      header: tc("voucherType"),
      render: (row) => <DocstatusBadge docstatus={row.docstatus} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {row.docstatus === 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelTarget(row.name)}
            >
              {tc("cancel")}
            </Button>
          )}
          {row.docstatus === 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row.name)}
            >
              {tc("delete")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  function handleCancel() {
    if (!cancelTarget) return;
    cancelEntry.mutate(cancelTarget, {
      onSuccess: () => {
        toast.success(tc("cancel"));
        setCancelTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteEntry.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success(tc("delete"));
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  const toolbar = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          {t("newStockEntry")}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push("/stock-entries/new?type=material-receipt")}>
          {t("materialReceipt")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/stock-entries/new?type=material-issue")}>
          {t("materialIssue")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/stock-entries/new?type=material-transfer")}>
          {t("materialTransfer")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("stockEntries")}</h1>

      <DataTable<StockEntryListItem>
        columns={columns}
        data={entries}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t("searchEntries")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        toolbar={toolbar}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title={tc("cancel")}
        description={`${tc("cancel")} "${cancelTarget}"?`}
        confirmLabel={tc("cancel")}
        variant="destructive"
        loading={cancelEntry.isPending}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={tc("delete")}
        description={`${tc("delete")} "${deleteTarget}"?`}
        confirmLabel={tc("delete")}
        variant="destructive"
        loading={deleteEntry.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
