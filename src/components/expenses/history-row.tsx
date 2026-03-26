"use client";

import { Send, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { useAuthStore } from "@/stores/auth-store";
import type { JournalEntryListItem } from "@/types/journal-entry";

interface HistoryRowProps {
  entry: JournalEntryListItem;
  currencySymbol: string;
  symbolOnRight: boolean;
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
  onSubmit,
  onEdit,
  onAmend,
  onCancel,
  onDelete,
  disabled,
}: HistoryRowProps) {
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const status = STATUS_CONFIG[entry.docstatus];

  return (
    <div
      className={cn(
        "group relative rounded-lg border-l-2 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 cursor-default",
        entry.docstatus === 0 && "border-l-amber-400",
        entry.docstatus === 1 && "border-l-blue-500",
        entry.docstatus === 2 && "border-l-muted-foreground/30",
      )}
    >
      {/* Row 1: Amount — full width */}
      <div>
        <span className="font-mono text-sm font-semibold">
          {formatCurrency(entry.total_debit, currencySymbol, symbolOnRight)}
        </span>
      </div>

      {/* Row 2: Date · ID · Badge */}
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="shrink-0">{formatDate(entry.posting_date)}</span>
        <span className="opacity-40 shrink-0">·</span>
        <a
          href={`${siteUrl}/app/journal-entry/${entry.name}`}
          target="_blank"
          rel="noopener noreferrer"
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
