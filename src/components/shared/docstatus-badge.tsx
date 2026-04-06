"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface DocstatusBadgeProps {
  docstatus: 0 | 1 | 2;
  status?: string;
}

export function DocstatusBadge({ docstatus, status }: DocstatusBadgeProps) {
  const t = useTranslations("status");

  // Map ERPNext status strings to translation keys
  const statusKeyMap: Record<string, string> = {
    Paid: "paid",
    Completed: "completed",
    Overdue: "overdue",
    Unpaid: "unpaid",
    Return: "return",
    "Credit Note Issued": "creditNoteIssued",
    "Debit Note Issued": "debitNoteIssued",
    Claimed: "claimed",
    Returned: "returned",
    "Partly Claimed and Returned": "partlyClaimedAndReturned",
  };

  // Cancelled takes absolute precedence — ignore computed status field
  if (docstatus === 2) {
    return <Badge variant="destructive">{t("cancelled")}</Badge>;
  }

  // If Frappe provides a computed status (e.g., Paid, Overdue), use it
  if (status && docstatus === 1) {
    const variant = getStatusVariant(status);
    const translationKey = statusKeyMap[status];
    const label = translationKey ? t(translationKey) : status;
    return <Badge variant={variant}>{label}</Badge>;
  }

  const docstatusLabels: Record<
    number,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    0: { label: t("draft"), variant: "secondary" },
    1: { label: t("submitted"), variant: "default" },
    2: { label: t("cancelled"), variant: "destructive" },
  };

  const config = docstatusLabels[docstatus] ?? docstatusLabels[0];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Paid":
    case "Completed":
      return "default";
    case "Overdue":
    case "Unpaid":
      return "destructive";
    case "Return":
    case "Credit Note Issued":
    case "Debit Note Issued":
    case "Returned":
      return "outline";
    case "Claimed":
      return "default";
    case "Partly Claimed and Returned":
      return "secondary";
    default:
      return "secondary";
  }
}
