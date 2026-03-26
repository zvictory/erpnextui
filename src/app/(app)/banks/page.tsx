"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import {
  useBankAccountList,
  useBankAccountCount,
  useDeleteAccount,
  useCurrencyMap,
} from "@/hooks/use-accounts";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency } from "@/lib/formatters";
import type { BankAccountListItem } from "@/types/account";
import type { ColumnDef } from "@/components/shared/data-table";

export default function BanksPage() {
  const router = useRouter();
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const { company } = useCompanyStore();
  const listState = useListState("account_name asc");
  const { data: currencyMap } = useCurrencyMap();

  const { data: banks = [], isLoading } = useBankAccountList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useBankAccountCount(company, listState.debouncedSearch);

  const deleteAccount = useDeleteAccount();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const columns: ColumnDef<BankAccountListItem>[] = [
    {
      key: "account_name",
      header: t("accountName"),
      sortKey: "account_name",
      render: (row) => row.account_name,
    },
    {
      key: "account_currency",
      header: t("currency"),
      render: (row) => row.account_currency,
    },
    {
      key: "balance",
      header: t("balance"),
      className: "text-right",
      render: (row) => {
        const bal = row.balance ?? 0;
        const info = currencyMap?.get(row.account_currency);
        return formatCurrency(bal, info?.symbol ?? row.account_currency, info?.onRight ?? false);
      },
    },
    {
      key: "bank_name",
      header: t("bankName"),
      render: (row) => row.bank_name ?? "\u2014",
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => setEditAccountName(row.name)}>
            {t("edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row.name)}
          >
            {tc("delete")}
          </Button>
        </div>
      ),
    },
  ];

  function handleDelete() {
    if (!deleteTarget) return;
    deleteAccount.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success(t("deleteSuccess"));
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("banks")}</h1>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("newBankAccount")}
        </Button>
      </div>

      <DataTable<BankAccountListItem>
        columns={columns}
        data={banks}
        isLoading={isLoading}
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={tc("search")}
        sort={listState.sort}
        onSortChange={listState.setSort}
        page={listState.page}
        pageSize={listState.pageSize}
        totalCount={totalCount}
        onNextPage={listState.nextPage}
        onPrevPage={listState.prevPage}
        onRowClick={(row) => router.push(`/banks/${encodeURIComponent(row.name)}`)}
      />

      <AccountFormDialog mode="bank" open={showNewDialog} onOpenChange={setShowNewDialog} />

      <AccountFormDialog
        mode="bank"
        editName={editAccountName ?? undefined}
        open={!!editAccountName}
        onOpenChange={(v) => !v && setEditAccountName(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={tc("delete")}
        description={`${tc("delete")} "${deleteTarget}"?`}
        confirmLabel={tc("delete")}
        variant="destructive"
        loading={deleteAccount.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
