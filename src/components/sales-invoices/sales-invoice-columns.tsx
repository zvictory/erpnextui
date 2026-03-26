"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Printer, Trash2, Send, X, Copy, RotateCcw } from "lucide-react";
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
import type { SalesInvoiceListItem } from "@/types/sales-invoice";
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

export function getSalesInvoiceColumns(
  actions: ColumnActions,
  perms: ColumnPermissions = {},
  currencyMap?: Map<string, CurrencyInfo>,
  t?: TFunc,
): ColumnDef<SalesInvoiceListItem>[] {
  const { canDelete = true, canSubmit = true, canCancel = true } = perms;
  const tr = t ?? ((k: string) => k);

  return [
    {
      key: "name",
      header: tr("invoiceNo"),
      sortKey: "name",
      render: (row) => (
        <Link
          href={`/sales-invoices/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "customer",
      header: tr("customer"),
      render: (row) => row.customer_name,
    },
    {
      key: "posting_date",
      header: tr("date"),
      sortKey: "posting_date",
      render: (row) => formatDate(row.posting_date),
    },
    {
      key: "grand_total",
      header: tr("grandTotal"),
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
              <Link href={`/sales-invoices/${encodeURIComponent(row.name)}`}>
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
            {row.docstatus >= 1 && (
              <DropdownMenuItem asChild>
                <a
                  href={`/sales-invoices/${encodeURIComponent(row.name)}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {tr("printReceipt")}
                </a>
              </DropdownMenuItem>
            )}
            {row.docstatus === 1 && (
              <>
                {!row.is_return && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/sales-invoices/new?return_against=${encodeURIComponent(row.name)}`}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {tr("createReturn")}
                    </Link>
                  </DropdownMenuItem>
                )}
                {canCancel && (
                  <DropdownMenuItem onClick={() => actions.onCancel(row.name)}>
                    <X className="mr-2 h-4 w-4" />
                    {tr("cancel")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/sales-invoices/new?amend_from=${encodeURIComponent(row.name)}`}>
                    <Copy className="mr-2 h-4 w-4" />
                    {tr("amend")}
                  </Link>
                </DropdownMenuItem>
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
