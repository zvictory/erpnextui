"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Send, X, ShoppingCart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import type { ColumnDef } from "@/components/shared/data-table";
import type { QuotationListItem } from "@/types/quotation";
import type { CurrencyInfo } from "@/hooks/use-accounts";
import { formatInvoiceCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";

interface ColumnActions {
  onSubmit: (name: string) => void;
  onCancel: (name: string) => void;
  onDelete: (name: string) => void;
}

interface ColumnPermissions {
  canDelete?: boolean;
  canSubmit?: boolean;
  canCancel?: boolean;
}

type TFunc = (key: string) => string;

export function getQuotationColumns(
  actions: ColumnActions,
  perms: ColumnPermissions = {},
  currencyMap?: Map<string, CurrencyInfo>,
  t?: TFunc,
): ColumnDef<QuotationListItem>[] {
  const { canDelete = true, canSubmit = true, canCancel = true } = perms;
  const tr = t ?? ((k: string) => k);

  return [
    {
      key: "name",
      header: tr("quotationNo"),
      sortKey: "name",
      render: (row) => (
        <Link
          href={`/quotations/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "party_name",
      header: tr("customer"),
      render: (row) => row.customer_name || row.party_name,
    },
    {
      key: "transaction_date",
      header: tr("date"),
      sortKey: "transaction_date",
      render: (row) => formatDate(row.transaction_date),
    },
    {
      key: "valid_till",
      header: tr("validTill"),
      sortKey: "valid_till",
      render: (row) => formatDate(row.valid_till),
    },
    {
      key: "grand_total",
      header: tr("amount"),
      className: "text-right",
      sortKey: "grand_total",
      render: (row) =>
        formatInvoiceCurrency(row.grand_total ?? 0, row.currency, currencyMap?.get(row.currency)),
    },
    {
      key: "status",
      header: tr("status"),
      render: (row) => <DocstatusBadge docstatus={row.docstatus} status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/quotations/${encodeURIComponent(row.name)}`}>
                <Pencil className="mr-2 h-4 w-4" />
                {row.docstatus === 0 ? tr("edit") : tr("view")}
              </Link>
            </DropdownMenuItem>
            {row.docstatus === 0 && canSubmit && (
              <DropdownMenuItem onClick={() => actions.onSubmit(row.name)}>
                <Send className="mr-2 h-4 w-4" />
                {tr("submit")}
              </DropdownMenuItem>
            )}
            {row.docstatus === 1 && (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`/sales-orders/new?from_quotation=${encodeURIComponent(row.name)}`}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {tr("createSalesOrder")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/sales-invoices/new?from_quotation=${encodeURIComponent(row.name)}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    {tr("createInvoice")}
                  </Link>
                </DropdownMenuItem>
                {canCancel && (
                  <DropdownMenuItem onClick={() => actions.onCancel(row.name)}>
                    <X className="mr-2 h-4 w-4" />
                    {tr("cancel")}
                  </DropdownMenuItem>
                )}
              </>
            )}
            {(row.docstatus === 0 || row.docstatus === 2) && canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => actions.onDelete(row.name)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tr("delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
