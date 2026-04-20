"use client";

import Link from "next/link";
import { MoreHorizontal, Eye, X, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocstatusBadge } from "@/components/shared/docstatus-badge";
import type { ColumnDef } from "@/components/shared/data-table";
import type { PaymentEntryListItem } from "@/types/payment-entry";
import type { CurrencyInfo } from "@/hooks/use-accounts";
import { formatInvoiceCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";

interface ColumnActions {
  onCancel: (name: string) => void;
  onDelete: (name: string) => void;
}

interface ColumnPermissions {
  canCancel?: boolean;
  canDelete?: boolean;
}

type TFunc = (key: string) => string;

function getAmendHref(row: PaymentEntryListItem): string {
  const base = row.payment_type === "Receive" ? "/payments/receive" : "/payments/pay";
  return `${base}?amend_from=${encodeURIComponent(row.name)}`;
}

export function getPaymentColumns(
  actions: ColumnActions,
  perms: ColumnPermissions = {},
  currencyMap?: Map<string, CurrencyInfo>,
  t?: TFunc,
): ColumnDef<PaymentEntryListItem>[] {
  const { canCancel = true, canDelete = true } = perms;
  const tr = t ?? ((k: string) => k);

  return [
    {
      key: "name",
      header: tr("paymentNo"),
      sortKey: "name",
      render: (row) => (
        <Link
          href={`/payments/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "payment_type",
      header: tr("type"),
      render: (row) => (
        <Badge variant={row.payment_type === "Receive" ? "default" : "secondary"}>
          {row.payment_type === "Receive" ? tr("receive") : tr("pay")}
        </Badge>
      ),
    },
    {
      key: "party_name",
      header: tr("party"),
      render: (row) => row.party_name || row.party,
    },
    {
      key: "posting_date",
      header: tr("date"),
      sortKey: "posting_date",
      render: (row) => formatDate(row.posting_date),
    },
    {
      key: "paid_amount",
      header: tr("amount"),
      className: "text-right",
      sortKey: "paid_amount",
      render: (row) => {
        const currency =
          row.payment_type === "Receive"
            ? row.paid_to_account_currency
            : row.paid_from_account_currency;
        return formatInvoiceCurrency(
          row.paid_amount ?? 0,
          currency ?? "",
          currencyMap?.get(currency ?? ""),
        );
      },
    },
    {
      key: "status",
      header: tr("paymentType"),
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
              <Link href={`/payments/${encodeURIComponent(row.name)}`}>
                <Eye className="mr-2 h-4 w-4" />
                {tr("paymentEntry")}
              </Link>
            </DropdownMenuItem>
            {row.docstatus === 1 && canCancel && (
              <DropdownMenuItem onClick={() => actions.onCancel(row.name)}>
                <X className="mr-2 h-4 w-4" />
                {tr("cancelPayment")}
              </DropdownMenuItem>
            )}
            {row.docstatus === 2 && (
              <DropdownMenuItem asChild>
                <Link href={getAmendHref(row)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {tr("amend")}
                </Link>
              </DropdownMenuItem>
            )}
            {(row.docstatus === 0 || row.docstatus === 2) && canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => actions.onDelete(row.name)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tr("deletePayment")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
