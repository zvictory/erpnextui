"use client";

"use client";

import { useState } from "react";
import { ArrowRight, Send, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import { formatDate, formatNumber } from "@/lib/formatters";
import { useJournalEntry } from "@/hooks/use-journal-entries";
import { useCurrencyMap } from "@/hooks/use-accounts";
import type { JournalEntryListItem, JEAccountRow } from "@/types/journal-entry";

interface HistoryRowProps {
  entry: JournalEntryListItem;
  currencySymbol: string;
  symbolOnRight: boolean;
  accountRows?: JEAccountRow[];
  accountRowsLoading?: boolean;
  onSubmit: (name: string) => void;
  onEdit?: (name: string) => void;
  onAmend?: (name: string) => void;
  onCancel: (name: string) => void;
  onDelete: (name: string) => void;
  disabled: boolean;
}

const STATUS_CONFIG: Record<
  0 | 1 | 2,
  { label: string; variant: "secondary" | "default" | "destructive"; className?: string }
> = {
  0: { label: "Draft", variant: "secondary" },
  1: {
    label: "Submitted",
    variant: "default",
    className: "bg-blue-600 text-white hover:bg-blue-600",
  },
  2: { label: "Cancelled", variant: "destructive" },
};

export function HistoryRow({
  entry,
  currencySymbol,
  symbolOnRight,
  accountRows,
  accountRowsLoading,
  onSubmit,
  onEdit,
  onAmend,
  onCancel,
  onDelete,
  disabled,
}: HistoryRowProps) {
  const status = STATUS_CONFIG[entry.docstatus];
  const [expanded, setExpanded] = useState(false);
  const { data: jeDoc, isLoading: jeLoading } = useJournalEntry(expanded ? entry.name : "");
  const { data: currencyMap } = useCurrencyMap();

  const fromRow = accountRows?.find((r) => (r.credit_in_account_currency ?? 0) > 0);
  const toRow = accountRows?.find((r) => (r.debit_in_account_currency ?? 0) > 0);
  const sameCurrency = fromRow && toRow && fromRow.account_currency === toRow.account_currency;

  function currSymbol(code: string): [string, boolean] {
    const info = currencyMap?.get(code);
    return [info?.symbol ?? code, !!info?.onRight];
  }

  return (
    <div
      onClick={() => {
        if (onEdit) {
          onEdit(entry.name);
        } else {
          setExpanded(!expanded);
        }
      }}
      className={cn(
        "group relative rounded-lg border-l-2 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 cursor-pointer",
        entry.docstatus === 0 && "border-l-amber-400",
        entry.docstatus === 1 && "border-l-blue-500",
        entry.docstatus === 2 && "border-l-muted-foreground/30",
      )}
    >
      {/* Row 1: Amount — full width */}
      <div>
        <span className="font-mono text-sm font-semibold">
          {fromRow && toRow ? (
            sameCurrency ? (
              formatCurrency(toRow.debit_in_account_currency, ...currSymbol(toRow.account_currency))
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span>
                    {formatCurrency(
                      fromRow.credit_in_account_currency,
                      ...currSymbol(fromRow.account_currency),
                    )}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {formatCurrency(
                      toRow.debit_in_account_currency,
                      ...currSymbol(toRow.account_currency),
                    )}
                  </span>
                </span>
              </div>
            )
          ) : accountRowsLoading ? (
            <Skeleton className="h-4 w-24 inline-block" />
          ) : (
            formatCurrency(entry.total_debit, currencySymbol, symbolOnRight)
          )}
        </span>
        {fromRow &&
          toRow &&
          !sameCurrency &&
          (() => {
            const STRONG = ["USD", "EUR", "GBP", "CNY", "RUB"];
            const toIsBase =
              STRONG.includes(toRow.account_currency) && !STRONG.includes(fromRow.account_currency);
            const [bSym, qSym, fxRate] = toIsBase
              ? [
                  currSymbol(toRow.account_currency)[0],
                  currSymbol(fromRow.account_currency)[0],
                  fromRow.credit_in_account_currency / toRow.debit_in_account_currency,
                ]
              : [
                  currSymbol(fromRow.account_currency)[0],
                  currSymbol(toRow.account_currency)[0],
                  toRow.debit_in_account_currency / fromRow.credit_in_account_currency,
                ];
            return (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                1 {bSym} = {formatNumber(fxRate, 4)} {qSym}
              </p>
            );
          })()}
      </div>

      {/* Row 2: Date · ID · Badge */}
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="shrink-0">{formatDate(entry.posting_date)}</span>
        <span className="opacity-40 shrink-0">·</span>
        <a
          href={`/ledger/${encodeURIComponent(entry.name)}`}
          className="min-w-0 truncate text-primary/70 hover:text-primary hover:underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          {entry.name}
        </a>
        <Badge
          variant={status.variant}
          className={`ml-auto shrink-0 text-[10px] px-1.5 py-0 leading-4 ${status.className ?? ""}`}
        >
          {status.label}
        </Badge>
      </div>

      {/* Row 3: Remark (if any) */}
      {entry.user_remark && (
        <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">{entry.user_remark}</p>
      )}

      {/* Expanded account details */}
      {expanded && (
        <div className="mt-2 space-y-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
          {jeLoading ? (
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          ) : jeDoc?.accounts?.length ? (
            jeDoc.accounts.map((acc, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground truncate mr-2">
                  {(acc as unknown as Record<string, string>).account_name ||
                    (acc.account ?? "").replace(/ - [A-Z]$/, "")}
                </span>
                <span className="tabular-nums shrink-0">
                  {(acc.debit_in_account_currency ?? 0) > 0 && (
                    <span className="text-red-600">
                      {formatNumber(acc.debit_in_account_currency ?? 0)} Dr
                    </span>
                  )}
                  {(acc.credit_in_account_currency ?? 0) > 0 && (
                    <span className="text-green-600">
                      {formatNumber(acc.credit_in_account_currency ?? 0)} Cr
                    </span>
                  )}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">No accounts</p>
          )}
        </div>
      )}

      {/* Actions — revealed on hover, keyboard accessible */}
      <div className="mt-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
        {entry.docstatus === 0 && (
          <>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onSubmit(entry.name)}
              disabled={disabled}
              aria-label="Submit entry"
              className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-blue-600"
            >
              <Send className="h-3 w-3" />
            </Button>
            {onEdit && (
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => onEdit(entry.name)}
                disabled={disabled}
                aria-label="Edit entry"
                className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onDelete(entry.name)}
              disabled={disabled}
              aria-label="Delete entry"
              className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
        {entry.docstatus === 1 && (
          <>
            {onAmend && (
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => onAmend(entry.name)}
                disabled={disabled}
                aria-label="Amend entry"
                className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onCancel(entry.name)}
              disabled={disabled}
              aria-label="Cancel entry"
              className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </>
        )}
        {entry.docstatus === 2 && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => onDelete(entry.name)}
            disabled={disabled}
            aria-label="Delete entry"
            className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
