"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { JournalEntryListItem } from "@/types/journal-entry";

interface HistoryRowProps {
  entry: JournalEntryListItem;
  currencySymbol: string;
  symbolOnRight: boolean;
  onSubmit: (name: string) => void;
  onEdit: (name: string) => void;
  onAmend: (name: string) => void;
  onCancel: (name: string) => void;
  onDelete: (name: string) => void;
  disabled: boolean;
}

function DocstatusBadge({ docstatus }: { docstatus: 0 | 1 | 2 }) {
  switch (docstatus) {
    case 0:
      return (
        <Badge variant="secondary" className="text-xs">
          Draft
        </Badge>
      );
    case 1:
      return (
        <Badge
          variant="default"
          className="bg-blue-600 text-white text-xs hover:bg-blue-600"
        >
          Submitted
        </Badge>
      );
    case 2:
      return (
        <Badge variant="destructive" className="text-xs">
          Cancelled
        </Badge>
      );
  }
}

function truncate(text: string, maxLength: number): string {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

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
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors">
      {/* Name link */}
      <a
        href={`/app/journal-entry/${entry.name}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-primary underline-offset-4 hover:underline shrink-0"
      >
        {entry.name}
      </a>

      {/* Date */}
      <span className="font-mono text-xs text-muted-foreground shrink-0">
        {entry.posting_date}
      </span>

      {/* Amount */}
      <span className="font-mono text-sm font-bold shrink-0">
        {formatCurrency(entry.total_debit, currencySymbol, symbolOnRight)}
      </span>

      {/* Remark */}
      <span className="flex-1 text-sm text-muted-foreground truncate min-w-0">
        {truncate(entry.user_remark, 60)}
      </span>

      {/* Status badge */}
      <DocstatusBadge docstatus={entry.docstatus} />

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {entry.docstatus === 0 && (
          <>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onSubmit(entry.name)}
              disabled={disabled}
            >
              Submit
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onEdit(entry.name)}
              disabled={disabled}
            >
              Edit
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => onDelete(entry.name)}
              disabled={disabled}
            >
              Delete
            </Button>
          </>
        )}
        {entry.docstatus === 1 && (
          <>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onAmend(entry.name)}
              disabled={disabled}
            >
              Amend
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => onCancel(entry.name)}
              disabled={disabled}
            >
              Cancel
            </Button>
          </>
        )}
        {entry.docstatus === 2 && (
          <Button
            size="xs"
            variant="destructive"
            onClick={() => onDelete(entry.name)}
            disabled={disabled}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
